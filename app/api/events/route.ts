import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { isAdminRequest, unauthorized } from '@/lib/auth';
import { INITIAL_EVENTS } from '@/lib/mockData';

// Fallback em memória para modo demonstração
let localEvents = [...INITIAL_EVENTS];

export async function GET() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (!error && data) {
      return NextResponse.json(data);
    }
  }

  return NextResponse.json(localEvents);
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    const newEvent = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description,
      date: body.date,
      time: body.time,
      vrchat_world: body.vrchat_world,
      world_url: body.world_url || '',
      image_url: body.image_url || '/images/banner.jpg',
      category: body.category || 'Encontro Oficial',
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
      return NextResponse.json(data, { status: 201 });
    }

    localEvents.unshift(newEvent);
    return NextResponse.json(newEvent, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao criar evento' }, { status: 500 });
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
