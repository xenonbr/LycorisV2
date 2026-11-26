import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminRequest, unauthorized } from '@/lib/auth';
import { INITIAL_EVENTS } from '@/lib/mockData';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'lycoris-media';
const EVENTS_EXTRAS_PATH = 'settings/events-extras.json';

interface EventExtraMeta {
  is_external?: boolean;
  external_platform?: string;
}

// Fallback em memória para modo demonstração
let localEvents = [...INITIAL_EVENTS];
let localExtras: Record<string, EventExtraMeta> = {};

// Valida estritamente se a data está no formato YYYY-MM-DD, com ano de 4 dígitos (2024 a 2035) e data real no calendário
function validateEventDate(dateStr: string): { valid: boolean; error?: string } {
  const trimmed = String(dateStr || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return {
      valid: false,
      error: 'Data inválida. Selecione uma data válida no formato DD/MM/AAAA (ano com 4 dígitos).',
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 2024 || year > 2035) {
    return {
      valid: false,
      error: 'Ano inválido. A data do evento deve estar entre 2024 e 2035.',
    };
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, error: 'Mês ou dia inválido na data do evento.' };
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { valid: false, error: 'Esta data não existe no calendário.' };
  }

  return { valid: true };
}

// Valida e normaliza o horário para o padrão HH:MM BRT (ex: "21:30" ou "21:30 BRT")
function validateAndNormalizeTime(timeStr: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  const trimmed = String(timeStr || '').trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?:\s*(?:BRT|h|hrs)?)?$/i.exec(trimmed);
  if (!match) {
    return {
      valid: false,
      error: 'Horário inválido. Informe um horário válido entre 00:00 e 23:59 (ex: 21:30).',
    };
  }
  return {
    valid: true,
    normalized: `${match[1]}:${match[2]} BRT`,
  };
}

function validateOptionalUrl(urlStr: string): { valid: boolean; cleaned: string; error?: string } {
  const trimmed = String(urlStr || '').trim();
  if (!trimmed) return { valid: true, cleaned: '' };
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { valid: false, cleaned: '', error: 'O link deve começar com https:// ou http://' };
    }
    return { valid: true, cleaned: trimmed };
  } catch {
    return { valid: false, cleaned: '', error: 'Link (URL) inválido.' };
  }
}

async function getEventsExtras(): Promise<Record<string, EventExtraMeta>> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(EVENTS_EXTRAS_PATH);
      if (!error && data) {
        const parsed = JSON.parse(await data.text());
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Arquivo ainda não existe
    }
  }
  return localExtras;
}

async function saveEventsExtras(map: Record<string, EventExtraMeta>): Promise<void> {
  localExtras = map;
  if (isSupabaseConfigured && supabaseAdmin) {
    const buffer = Buffer.from(JSON.stringify(map, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(EVENTS_EXTRAS_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
  }
}

function enrichEvent(ev: any, extras: Record<string, EventExtraMeta>) {
  const meta = (ev?.id && extras[ev.id]) || {};
  return {
    ...ev,
    is_external: Boolean(meta.is_external ?? ev.is_external),
    external_platform: meta.external_platform || ev.external_platform || '',
  };
}

export async function GET() {
  const extras = await getEventsExtras();
  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    const { data, error } = await client
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      return NextResponse.json(data.map((ev) => enrichEvent(ev, extras)));
    }
  }

  return NextResponse.json(localEvents.map((ev) => enrichEvent(ev, extras)));
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();

    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const vrchat_world = String(body.vrchat_world || '').trim();
    const is_external = Boolean(body.is_external);
    const external_platform = String(body.external_platform || '').trim();

    if (!title || !description || !vrchat_world) {
      return NextResponse.json(
        { error: 'Preencha o título, o local/plataforma e a descrição do evento.' },
        { status: 400 }
      );
    }

    const dateCheck = validateEventDate(body.date);
    if (!dateCheck.valid) {
      return NextResponse.json({ error: dateCheck.error }, { status: 400 });
    }

    const timeCheck = validateAndNormalizeTime(body.time);
    if (!timeCheck.valid) {
      return NextResponse.json({ error: timeCheck.error }, { status: 400 });
    }

    const urlCheck = validateOptionalUrl(body.world_url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }

    const newEvent = {
      id: crypto.randomUUID(),
      title,
      description,
      date: String(body.date).trim(),
      time: timeCheck.normalized!,
      vrchat_world,
      world_url: urlCheck.cleaned,
      image_url: body.image_url ? String(body.image_url).trim() : null,
      category: body.category || (is_external ? 'Live / Sorteio' : 'Encontro Oficial'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('events')
        .insert([newEvent])
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const extras = await getEventsExtras();
      extras[data.id] = { is_external, external_platform };
      await saveEventsExtras(extras);

      return NextResponse.json(enrichEvent(data, extras), { status: 201 });
    }

    const extras = await getEventsExtras();
    extras[newEvent.id] = { is_external, external_platform };
    await saveEventsExtras(extras);

    localEvents.unshift(newEvent as any);
    return NextResponse.json(enrichEvent(newEvent, extras), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao criar evento' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID do evento é obrigatório' }, { status: 400 });
    }

    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const vrchat_world = String(body.vrchat_world || '').trim();
    const is_external = Boolean(body.is_external);
    const external_platform = String(body.external_platform || '').trim();

    if (!title || !description || !vrchat_world) {
      return NextResponse.json(
        { error: 'Preencha o título, o local/plataforma e a descrição do evento.' },
        { status: 400 }
      );
    }

    const dateCheck = validateEventDate(body.date);
    if (!dateCheck.valid) {
      return NextResponse.json({ error: dateCheck.error }, { status: 400 });
    }

    const timeCheck = validateAndNormalizeTime(body.time);
    if (!timeCheck.valid) {
      return NextResponse.json({ error: timeCheck.error }, { status: 400 });
    }

    const urlCheck = validateOptionalUrl(body.world_url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400 });
    }

    const patch = {
      title,
      description,
      date: String(body.date || '').trim(),
      time: timeCheck.normalized!,
      vrchat_world,
      world_url: urlCheck.cleaned,
      image_url: body.image_url ? String(body.image_url).trim() : null,
      category: body.category || (is_external ? 'Live / Sorteio' : 'Encontro Oficial'),
      updated_at: new Date().toISOString(),
    };

    const extras = await getEventsExtras();
    extras[body.id] = { is_external, external_platform };
    await saveEventsExtras(extras);

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('events')
        .update(patch)
        .eq('id', body.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json(enrichEvent(data, extras));
    }

    localEvents = localEvents.map((e) => (e.id === body.id ? ({ ...e, ...patch } as any) : e));
    const updated = localEvents.find((e) => e.id === body.id);
    return NextResponse.json(enrichEvent(updated || { id: body.id, ...patch }, extras));
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar evento' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do evento é obrigatório' }, { status: 400 });
    }

    const extras = await getEventsExtras();
    if (extras[id]) {
      delete extras[id];
      await saveEventsExtras(extras);
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    localEvents = localEvents.filter((e) => e.id !== id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao excluir evento' }, { status: 500 });
  }
}
