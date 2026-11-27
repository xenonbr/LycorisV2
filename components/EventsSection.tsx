"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  UserPlus,
  UserCheck,
  Trash2,
  AlertCircle,
  X,
  Radio,
} from 'lucide-react';
import { VRChatEvent, EventRegistration } from '@/lib/types';

function formatEventDatePtBr(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!m) return dateStr;
  const year = Number(m[1]);
  if (year < 2024 || year > 2035) return dateStr;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function EventsSection() {
  const [events, setEvents] = useState<VRChatEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inscrições vinculadas ao IP/dispositivo do visitante (1 por evento)
  const [myRegistrations, setMyRegistrations] = useState<Record<string, EventRegistration>>({});

  // Modal de Inscrição
  const [regEvent, setRegEvent] = useState<VRChatEvent | null>(null);
  const [regForm, setRegForm] = useState({ name: '', username: '', notes: '' });
  const [regStatus, setRegStatus] = useState<
    'idle' | 'sending' | 'done' | 'already' | 'cancelling' | 'cancelled'
  >('idle');
  const [regError, setRegError] = useState('');

  const fetchMyRegistrations = async () => {
    try {
      const res = await fetch('/api/registrations?my=1', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.myRegistrations && typeof data.myRegistrations === 'object') {
          setMyRegistrations(data.myRegistrations);
        }
      }
    } catch {
      // ignora erro de rede
    }
  };

  const openRegistration = (ev: VRChatEvent) => {
    setRegEvent(ev);
    setRegError('');
    if (myRegistrations[ev.id]) {
      setRegStatus('already');
    } else {
      setRegStatus('idle');
    }
  };

  const closeRegistration = () => {
    setRegEvent(null);
    setRegForm({ name: '', username: '', notes: '' });
    setRegError('');
  };

  // Trava a rolagem da página de fundo e fecha com ESC quando o modal de inscrição estiver aberto
  useEffect(() => {
    if (!regEvent) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') closeRegistration();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [regEvent]);

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
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.registration) {
          setMyRegistrations((prev) => ({
            ...prev,
            [regEvent.id]: data.registration,
          }));
        } else {
          fetchMyRegistrations();
        }
        setRegStatus('done');
      } else if (res.status === 409 && data.alreadyRegistered && data.registration) {
        setMyRegistrations((prev) => ({
          ...prev,
          [regEvent.id]: data.registration,
        }));
        setRegStatus('already');
      } else {
        setRegError(data.error || 'Não foi possível concluir a inscrição.');
        setRegStatus('idle');
      }
    } catch {
      setRegError('Erro de conexão. Tente novamente.');
      setRegStatus('idle');
    }
  };

  const handleCancelMyRegistration = async () => {
    if (!regEvent) return;
    const existing = myRegistrations[regEvent.id];
    setRegStatus('cancelling');
    setRegError('');
    try {
      const params = new URLSearchParams({
        self: '1',
        eventId: regEvent.id,
      });
      if (existing?.id) params.set('id', existing.id);

      const res = await fetch(`/api/registrations?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMyRegistrations((prev) => {
          const next = { ...prev };
          delete next[regEvent.id];
          return next;
        });
        setRegStatus('cancelled');
      } else {
        setRegError(data.error || 'Não foi possível cancelar a inscrição.');
        setRegStatus('already');
      }
    } catch {
      setRegError('Erro de conexão ao cancelar inscrição.');
      setRegStatus('already');
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
    fetchMyRegistrations();
  }, []);

  const handleCopyLink = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const activeExistingReg = regEvent ? myRegistrations[regEvent.id] : undefined;

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
            const isExternal = Boolean(event.is_external);
            const isAlreadyInEvent = Boolean(myRegistrations[event.id]);

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
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-lycoris-950/90 border border-lycoris-800/60 text-lycoris-300 backdrop-blur-sm">
                        {event.category || 'Encontro Oficial'}
                      </span>
                      {isExternal && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/85 border border-gothic-gold/50 text-gothic-gold backdrop-blur-sm">
                          <Radio className="w-3 h-3 text-gothic-gold animate-pulse" />
                          <span>{event.external_platform || 'Evento Externo'}</span>
                        </span>
                      )}
                      {isAlreadyInEvent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/85 border border-emerald-600/60 text-emerald-300 backdrop-blur-sm">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Inscrito</span>
                        </span>
                      )}
                    </div>
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
                      <span>{formatEventDatePtBr(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-200">
                      {isExternal ? (
                        <Radio className="w-4 h-4 text-gothic-gold shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-lycoris-500 shrink-0" />
                      )}
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
                    {isAlreadyInEvent ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Quero Participar</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Quero Participar</span>
                      </>
                    )}
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
                          <span>
                            {isExternal
                              ? `Acessar ${event.external_platform || 'Transmissão'}`
                              : 'Lançar Mundo'}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleCopyLink(event.world_url || '', event.id)}
                          title={isExternal ? 'Copiar link da transmissão' : 'Copiar link da instância'}
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
                        {isExternal
                          ? 'Link da transmissão será divulgado antes do início'
                          : 'Link da instância liberado 30min antes'}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Inscrição renderizado em Portal no document.body */}
      {regEvent &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overscroll-contain"
            onClick={closeRegistration}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl bg-zinc-950 border border-lycoris-800/60 p-6 shadow-lycoris-glow space-y-4"
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
                    Nos vemos em <strong className="text-white">{regEvent.vrchat_world}</strong> ({regEvent.title}).
                  </p>
                  <button
                    onClick={closeRegistration}
                    className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Fechar
                  </button>
                </div>
              ) : regStatus === 'cancelled' ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6 text-lycoris-400" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-white">
                    Inscrição cancelada
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Sua inscrição em <strong className="text-white">{regEvent.title}</strong> foi removida com sucesso.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegForm({ name: '', username: '', notes: '' });
                        setRegStatus('idle');
                      }}
                      className="px-4 py-2 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 text-white text-xs font-semibold"
                    >
                      Inscrever-se novamente
                    </button>
                    <button
                      type="button"
                      onClick={closeRegistration}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : regStatus === 'already' || regStatus === 'cancelling' ? (
                <div className="py-3 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-950/90 border border-emerald-600/60 flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 pr-4">
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                        Inscrição Ativa
                      </span>
                      <h3 className="font-serif text-lg font-bold text-white leading-snug">
                        Você já está cadastrado neste evento!
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Evento:</span>
                      <span className="font-semibold text-white text-right">{regEvent.title}</span>
                    </div>
                    {activeExistingReg && (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-400">Nome cadastrado:</span>
                          <span className="font-semibold text-zinc-200 text-right">
                            {activeExistingReg.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-400">Usuário:</span>
                          <span className="font-semibold text-lycoris-400 text-right">
                            @{activeExistingReg.username}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    É permitida apenas <strong>uma inscrição por participante</strong> em cada evento. Deseja cancelar a sua inscrição atual?
                  </p>

                  {regError && (
                    <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={regStatus === 'cancelling'}
                      onClick={handleCancelMyRegistration}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 disabled:opacity-50 border border-red-700/80 text-red-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {regStatus === 'cancelling'
                          ? 'Cancelando inscrição...'
                          : 'Sim, Cancelar Inscrição'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={regStatus === 'cancelling'}
                      onClick={closeRegistration}
                      className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                    >
                      Manter Inscrição
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitRegistration} className="space-y-4">
                  <div className="space-y-1 pr-6">
                    <p className="text-[11px] uppercase tracking-widest text-lycoris-400 font-bold">Inscrição</p>
                    <h3 className="font-serif text-xl font-bold text-white">{regEvent.title}</h3>
                    <p className="text-xs text-zinc-400">
                      {formatEventDatePtBr(regEvent.date)} às {regEvent.time}
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
                    <label className="block text-xs text-zinc-400 mb-1">
                      {regEvent.is_external
                        ? 'Seu usuário (VRChat / Discord / Rede Social)'
                        : 'Usuário no VRChat'}
                    </label>
                    <input
                      required
                      maxLength={100}
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      placeholder={
                        regEvent.is_external
                          ? 'Ex: @seunick no TikTok / Discord / VRChat'
                          : 'Seu nick exato no VRChat'
                      }
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
          </div>,
          document.body
        )}
    </section>
  );
}
