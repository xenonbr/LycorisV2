import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminRequest, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Fallback em memória (modo demonstração, sem Supabase)
let localRegistrations: any[] = [];

// Admin: lista inscrições (opcionalmente filtradas por evento)
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const eventId = new URL(request.url).searchParams.get('eventId');

  if (isSupabaseConfigured && supabaseAdmin) {
    let query = supabaseAdmin
      .from('event_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (eventId) query = query.eq('event_id', eventId);
    const { data, error } = await query;
    if (!error && data) return NextResponse.json(data);
  }

  return NextResponse.json(
    eventId ? localRegistrations.filter((r) => r.event_id === eventId) : localRegistrations
  );
}

// Público: qualquer visitante se inscreve em um evento
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event_id = String(body.event_id || '').trim();
    const name = String(body.name || '').trim().slice(0, 100);
    const username = String(body.username || '').trim().replace(/^@/, '').slice(0, 100);
    const notes = String(body.notes || '').trim().slice(0, 300);

    if (!event_id || !name || !username) {
      return NextResponse.json(
        { error: 'Nome e usuário do VRChat são obrigatórios.' },
        { status: 400 }
      );
    }

    const registration = {
      id: crypto.randomUUID(),
      event_id,
      name,
      username,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabaseAdmin) {
      // Evita inscrição duplicada do mesmo usuário no mesmo evento
      const { data: existing } = await supabaseAdmin
        .from('event_registrations')
        .select('id')
        .eq('event_id', event_id)
        .ilike('username', username)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: 'Este usuário já está inscrito neste evento.' },
          { status: 409 }
        );
      }

      const { error } = await supabaseAdmin.from('event_registrations').insert([registration]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true }, { status: 201 });
    }

    if (localRegistrations.some((r) => r.event_id === event_id && r.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: 'Este usuário já está inscrito neste evento.' }, { status: 409 });
    }
    localRegistrations.unshift(registration);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao registrar inscrição' }, { status: 500 });
  }
}

// Admin: remove inscrição
export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin.from('event_registrations').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  localRegistrations = localRegistrations.filter((r) => r.id !== id);
  return NextResponse.json({ success: true });
}
