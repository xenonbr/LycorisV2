import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SUPPORTERS } from '@/lib/mockData';
import { isAdminRequest, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

let localSupporters = INITIAL_SUPPORTERS.map((s, i) => ({
  ...s,
  id: s.id || `local-${i}`,
  sort_order: i,
}));

export async function GET() {
  const client = supabaseAdmin || supabase;
  if (isSupabaseConfigured && client) {
    const { data, error } = await client
      .from('supporters')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!error && data) return NextResponse.json(data);
  }
  return NextResponse.json(localSupporters);
}

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const url = String(body.url || '').trim();
    if (!name || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Nome e uma URL válida (http/https) são obrigatórios.' }, { status: 400 });
    }

    const isOwner = Boolean(body.is_owner);
    const supporter = {
      id: crypto.randomUUID(),
      name,
      url,
      tagline: String(body.tagline || '').trim(),
      role: String(body.role || 'Apoiador').trim(),
      avatar: body.avatar && isValidUrl(String(body.avatar)) ? String(body.avatar).trim() : null,
      sort_order: isOwner ? -1 : Number(body.sort_order) || 0,
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('supporters').insert([supporter]).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data, { status: 201 });
    }

    localSupporters.push(supporter as any);
    return NextResponse.json(supporter, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao cadastrar apoiador' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    const url = String(body.url || '').trim();
    if (!String(body.name || '').trim() || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Nome e uma URL válida são obrigatórios.' }, { status: 400 });
    }
    const isOwner = Boolean(body.is_owner);
    const patch = {
      name: String(body.name).trim(),
      url,
      tagline: String(body.tagline || '').trim(),
      role: String(body.role || 'Apoiador').trim(),
      avatar: body.avatar && isValidUrl(String(body.avatar)) ? String(body.avatar).trim() : null,
      sort_order: isOwner ? -1 : 0,
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('supporters').update(patch).eq('id', body.id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data);
    }

    localSupporters = localSupporters.map((s) => (s.id === body.id ? { ...s, ...patch } as any : s));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao atualizar apoiador' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin.from('supporters').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  localSupporters = localSupporters.filter((s) => s.id !== id);
  return NextResponse.json({ success: true });
}
