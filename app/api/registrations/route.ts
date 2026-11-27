import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  canAccessAdminModule,
  forbiddenMaster,
  checkRateLimit,
  tooManyRequests,
  getClientIp,
  computeIpHash,
  computeIpTag,
  parseCookieHeader,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PRIVATE_BUCKET = 'lycoris-private';
const REG_IDENTITIES_PATH = 'settings/registration-identities.json';
const REG_COOKIE_NAME = 'lycoris_event_regs';

interface RegIdentityRecord {
  ipHash: string;
  ipTag: string;
  eventId: string;
  updatedAt: string;
}

interface RegIdentityStore {
  byRegId: Record<string, RegIdentityRecord>;
}

// Fallback em memória
let localRegistrations: any[] = [];
let localIdentityStore: RegIdentityStore = { byRegId: {} };

async function getRegIdentities(): Promise<RegIdentityStore> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(PRIVATE_BUCKET)
        .download(REG_IDENTITIES_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (parsed && typeof parsed === 'object' && parsed.byRegId) {
          localIdentityStore = { byRegId: parsed.byRegId };
          return localIdentityStore;
        }
      }
    } catch {
      // ignora se ainda não existir
    }
  }
  return localIdentityStore;
}

async function saveRegIdentities(store: RegIdentityStore): Promise<void> {
  localIdentityStore = store;
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const buffer = Buffer.from(JSON.stringify(store, null, 2), 'utf-8');
      await supabaseAdmin.storage
        .from(PRIVATE_BUCKET)
        .upload(REG_IDENTITIES_PATH, buffer, {
          contentType: 'application/json',
          cacheControl: '0',
          upsert: true,
        });
    } catch {
      // ignora erro de bucket
    }
  }
}

function getCookieRegIds(request: Request): Set<string> {
  const raw = parseCookieHeader(request, REG_COOKIE_NAME);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function buildRegCookieHeader(ids: Set<string>): string {
  const value = encodeURIComponent(Array.from(ids).slice(-30).join(','));
  return `${REG_COOKIE_NAME}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax; HttpOnly`;
}

async function fetchAllActiveRegistrations(eventId?: string | null): Promise<any[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    let query = supabaseAdmin
      .from('event_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (eventId) query = query.eq('event_id', eventId);
    const { data, error } = await query;
    if (!error && Array.isArray(data)) return data;
  }
  return eventId
    ? localRegistrations.filter((r) => r.event_id === eventId)
    : localRegistrations;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isMyQuery = url.searchParams.get('my') === '1';
  const eventId = url.searchParams.get('eventId');

  // Modo Público (?my=1): retorna apenas as inscrições ativas vinculadas ao IP/dispositivo do próprio visitante
  if (isMyQuery) {
    const ipHash = computeIpHash(getClientIp(request));
    const cookieIds = getCookieRegIds(request);
    const store = await getRegIdentities();
    const allRegs = await fetchAllActiveRegistrations(eventId);

    const myRegistrations: Record<string, any> = {};
    for (const reg of allRegs) {
      const meta = store.byRegId[reg.id];
      const ownedByIp = meta && meta.ipHash === ipHash;
      const ownedByCookie = cookieIds.has(reg.id);
      if (ownedByIp || ownedByCookie) {
        if (!myRegistrations[reg.event_id]) {
          myRegistrations[reg.event_id] = {
            id: reg.id,
            event_id: reg.event_id,
            name: reg.name,
            username: reg.username,
            notes: reg.notes || null,
            created_at: reg.created_at,
          };
        }
      }
    }

    return NextResponse.json({ myRegistrations });
  }

  // Modo Admin: lista todas as inscrições
  if (!(await canAccessAdminModule(request, 'registrations'))) return forbiddenMaster();

  const store = await getRegIdentities();
  const regs = await fetchAllActiveRegistrations(eventId);
  const enriched = regs.map((r) => ({
    ...r,
    ip_tag: store.byRegId[r.id]?.ipTag || null,
  }));

  return NextResponse.json(enriched);
}

// Público: visitante se inscreve em um evento (apenas 1 inscrição por pessoa/IP por evento)
export async function POST(request: Request) {
  const rl = checkRateLimit(request, 'event-registration', 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  try {
    const body = await request.json();
    const event_id = String(body.event_id || '').trim();
    const name = String(body.name || '').trim().slice(0, 100);
    const username = String(body.username || '').trim().replace(/^@/, '').slice(0, 100);
    const notes = String(body.notes || '').trim().slice(0, 300);

    if (!event_id || !name || !username) {
      return NextResponse.json(
        { error: 'Nome e usuário são obrigatórios.' },
        { status: 400 }
      );
    }

    const ipHash = computeIpHash(getClientIp(request));
    const ipTag = computeIpTag(ipHash);
    const cookieIds = getCookieRegIds(request);
    const store = await getRegIdentities();
    const eventRegs = await fetchAllActiveRegistrations(event_id);

    // 1. Verifica se este IP ou dispositivo já possui uma inscrição ativa neste evento
    const existingByIpOrCookie = eventRegs.find((reg) => {
      const meta = store.byRegId[reg.id];
      return (meta && meta.ipHash === ipHash) || cookieIds.has(reg.id);
    });

    if (existingByIpOrCookie) {
      cookieIds.add(existingByIpOrCookie.id);
      return NextResponse.json(
        {
          alreadyRegistered: true,
          registration: {
            id: existingByIpOrCookie.id,
            event_id: existingByIpOrCookie.event_id,
            name: existingByIpOrCookie.name,
            username: existingByIpOrCookie.username,
            notes: existingByIpOrCookie.notes || null,
            created_at: existingByIpOrCookie.created_at,
          },
          error: 'Você já está cadastrado neste evento.',
        },
        {
          status: 409,
          headers: { 'Set-Cookie': buildRegCookieHeader(cookieIds) },
        }
      );
    }

    // 2. Verifica se o username digitado já está inscrito neste evento
    const existingByUsername = eventRegs.find(
      (reg) => String(reg.username || '').toLowerCase() === username.toLowerCase()
    );

    if (existingByUsername) {
      const meta = store.byRegId[existingByUsername.id];
      // Se era uma inscrição anterior sem vínculo de IP ou do mesmo IP, vincula ao IP atual e avisa que já está cadastrado (permitindo cancelar)
      if (!meta || meta.ipHash === ipHash) {
        store.byRegId[existingByUsername.id] = {
          ipHash,
          ipTag,
          eventId: event_id,
          updatedAt: new Date().toISOString(),
        };
        await saveRegIdentities(store);
        cookieIds.add(existingByUsername.id);

        return NextResponse.json(
          {
            alreadyRegistered: true,
            registration: {
              id: existingByUsername.id,
              event_id: existingByUsername.event_id,
              name: existingByUsername.name,
              username: existingByUsername.username,
              notes: existingByUsername.notes || null,
              created_at: existingByUsername.created_at,
            },
            error: 'Você já está cadastrado neste evento.',
          },
          {
            status: 409,
            headers: { 'Set-Cookie': buildRegCookieHeader(cookieIds) },
          }
        );
      }

      return NextResponse.json(
        { error: 'Este usuário já está inscrito neste evento por outro participante.' },
        { status: 409 }
      );
    }

    // 3. Cria a nova inscrição única para este evento
    const registration = {
      id: crypto.randomUUID(),
      event_id,
      name,
      username,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('event_registrations').insert([registration]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      localRegistrations.unshift(registration);
    }

    store.byRegId[registration.id] = {
      ipHash,
      ipTag,
      eventId: event_id,
      updatedAt: registration.created_at,
    };
    await saveRegIdentities(store);
    cookieIds.add(registration.id);

    return NextResponse.json(
      {
        success: true,
        registration,
      },
      {
        status: 201,
        headers: { 'Set-Cookie': buildRegCookieHeader(cookieIds) },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao registrar inscrição' },
      { status: 500 }
    );
  }
}

// Cancelar inscrição (pelo próprio participante via ?self=1 ou pelo Admin)
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const eventId = url.searchParams.get('eventId');
  const isSelf = url.searchParams.get('self') === '1';

  // Modo 1: O próprio participante cancela sua inscrição no evento
  if (isSelf) {
    const rl = checkRateLimit(request, 'event-registration-cancel', 10, 60_000);
    if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

    const ipHash = computeIpHash(getClientIp(request));
    const cookieIds = getCookieRegIds(request);
    const store = await getRegIdentities();
    const candidates = await fetchAllActiveRegistrations(eventId);

    const target = candidates.find((reg) => {
      if (id && reg.id !== id) return false;
      if (eventId && reg.event_id !== eventId) return false;
      const meta = store.byRegId[reg.id];
      return (meta && meta.ipHash === ipHash) || cookieIds.has(reg.id);
    });

    if (!target) {
      return NextResponse.json(
        { error: 'Inscrição não encontrada ou não pertence a este dispositivo.' },
        { status: 403 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('event_registrations')
        .delete()
        .eq('id', target.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      localRegistrations = localRegistrations.filter((r) => r.id !== target.id);
    }

    if (store.byRegId[target.id]) {
      delete store.byRegId[target.id];
      await saveRegIdentities(store);
    }
    cookieIds.delete(target.id);

    return NextResponse.json(
      { success: true, cancelledId: target.id },
      { headers: { 'Set-Cookie': buildRegCookieHeader(cookieIds) } }
    );
  }

  // Modo 2: Admin remove qualquer inscrição no painel
  if (!(await canAccessAdminModule(request, 'registrations'))) return forbiddenMaster();
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin.from('event_registrations').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    localRegistrations = localRegistrations.filter((r) => r.id !== id);
  }

  const store = await getRegIdentities();
  if (store.byRegId[id]) {
    delete store.byRegId[id];
    await saveRegIdentities(store);
  }

  return NextResponse.json({ success: true });
}
