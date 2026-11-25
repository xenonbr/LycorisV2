"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Copy, Check, UserPlus, X } from 'lucide-react';
import { VRChatEvent } from '@/lib/types';

export default function EventsSection() {
  const [events, setEvents] = useState<VRChatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inscrição
  const [regEvent, setRegEvent] = useState<VRChatEvent | null>(null);
  const [regForm, setRegForm] = useState({ name: '', username: '', notes: '' });
  const [regStatus, setRegStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [regError, setRegError] = useState('');

  const openRegistration = (ev: VRChatEvent) => {
    setRegEvent(ev);
    setRegStatus('idle');
    setRegError('');
  };

  const closeRegistration = () => {
    setRegEvent(null);
    setRegForm({ name: '', username: '', notes: '' });
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEvent) return;
    setRegStatus('sending');
    setRegError('');
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regForm, event_id: regEvent.id }),
      });
      if (res.ok) {
        setRegStatus('done');
      } else {
        const data = await res.json().catch(() => ({}));
        setRegError(data.error || 'Não foi possível concluir a inscrição.');
        setRegStatus('idle');
      }
    } catch {
      setRegError('Erro de conexão. Tente novamente.');
      setRegStatus('idle');
    }
  };

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const res = await fetch('/api/events', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setEvents(data);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar eventos:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const handleCopyLink = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <section id="eventos" className="relative py-16 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      <div className="text-center space-y-4 mb-10 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lycoris-950/70 border border-lycoris-800/40 text-lycoris-400 text-xs font-semibold uppercase tracking-widest">
          <Calendar className="w-3.5 h-3.5 text-lycoris-500" />
          Calendário de Instâncias
        </div>
        <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
          Próximos <span className="text-lycoris-500">Eventos</span>
        </h2>
        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-lycoris-600" />
          <div className="w-2 h-2 rotate-45 bg-lycoris-500 shadow-lycoris-glow" />
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-lycoris-600" />
        </div>
        <p className="font-sans text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Nossas instâncias no VRChat são criadas com foco em ambientação sonora imersiva, estética noturna e convivência respeitosa. Verifique os horários e garanta sua presença.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-zinc-500 animate-pulse">
          Carregando eventos do santuário...
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 max-w-lg mx-auto backdrop-blur-sm">
          <Calendar className="w-10 h-10 text-lycoris-500/60 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-white">Nenhum evento agendado no momento</h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Fique atento! Novos encontros sob a lua cheia serão publicados no painel em breve.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event) => {
            const hasBgImage = Boolean(
              event.image_url && event.image_url.trim() && event.image_url !== '/images/banner.jpg'
            );
            return (
            <article
              key={event.id}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800/80 hover:border-lycoris-600/50 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lycoris-glow hover:-translate-y-1 backdrop-blur-sm"
            >
              {/* Imagem do mapa/evento como fundo meio desfocado (opcional) */}
              {hasBgImage && (
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.image_url}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover scale-105 blur-[3px] opacity-55 group-hover:opacity-65 group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/55 via-zinc-950/60 to-zinc-950/85" />
                </div>
              )}

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-lycoris-950/90 border border-lycoris-800/60 text-lycoris-300 backdrop-blur-sm">
                    {event.category || 'Encontro Oficial'}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gothic-gold font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {event.time}
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-white group-hover:text-lycoris-300 transition-colors drop-shadow">
                  {event.title}
                </h3>

                <div className="space-y-2 text-xs sm:text-sm text-zinc-300 pt-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-lycoris-500 shrink-0" />
                    <span>{new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <MapPin className="w-4 h-4 text-lycoris-500 shrink-0" />
                    <span className="font-medium text-white">{event.vrchat_world}</span>
                  </div>
                </div>

                <p className="font-sans text-xs sm:text-sm text-zinc-300/90 leading-relaxed line-clamp-3">
                  {event.description}
                </p>
              </div>

              <div className="relative z-10 pt-6 mt-6 border-t border-zinc-800/80 space-y-3">
                <button
                  onClick={() => openRegistration(event)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-lycoris-700 to-lycoris-600 hover:from-lycoris-600 hover:to-lycoris-500 text-white text-xs font-semibold shadow-lycoris-glow transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Quero Participar
                </button>
                <div className="flex items-center justify-between gap-3">
                {event.world_url ? (
                  <>
                    <a
                      href={event.world_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-lycoris-700/80 hover:bg-lycoris-600 text-white text-xs font-semibold shadow-sm transition-all duration-200"
                    >
                      <span>Lançar Mundo</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleCopyLink(event.world_url || '', event.id)}
                      title="Copiar link da instância"
                      className="p-2.5 rounded-xl bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                    >
                      {copiedId === event.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-full text-center text-xs text-zinc-500 italic py-2">
                    Link da instância liberado 30min antes
                  </div>
                )}
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {/* Modal de Inscrição */}
      {regEvent && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={closeRegistration}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-lycoris-800/60 p-6 shadow-lycoris-glow space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeRegistration}
              aria-label="Fechar"
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {regStatus === 'done' ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-700 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-serif text-xl font-bold text-white">Inscrição confirmada!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Nos vemos em <strong className="text-white">{regEvent.vrchat_world}</strong>, {regEvent.title}. Fique de olho no seu VRChat para o convite.
                </p>
                <button
                  onClick={closeRegistration}
                  className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={submitRegistration} className="space-y-4">
                <div className="space-y-1 pr-6">
                  <p className="text-[11px] uppercase tracking-widest text-lycoris-400 font-bold">Inscrição</p>
                  <h3 className="font-serif text-xl font-bold text-white">{regEvent.title}</h3>
                  <p className="text-xs text-zinc-400">
                    {new Date(regEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {regEvent.time}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Seu nome</label>
                  <input
                    required
                    maxLength={100}
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    placeholder="Como podemos te chamar?"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-base sm:text-sm focus:outline-none focus:border-lycoris-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Usuário no VRChat</label>
                  <input
                    required
                    maxLength={100}
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    placeholder="Seu nick exato no VRChat"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-base sm:text-sm focus:outline-none focus:border-lycoris-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Observações (opcional)</label>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={regForm.notes}
                    onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })}
                    placeholder="Plataforma (PC/Quest/VR), acessibilidade, etc."
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-base sm:text-sm focus:outline-none focus:border-lycoris-500 resize-none"
                  />
                </div>

                {regError && (
                  <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300">
                    {regError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={regStatus === 'sending'}
                  className="w-full py-3 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 disabled:opacity-60 text-white font-semibold text-sm shadow-lycoris-glow transition-all"
                >
                  {regStatus === 'sending' ? 'Enviando...' : 'Confirmar Inscrição'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
