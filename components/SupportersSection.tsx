"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Sparkles, Award, ArrowRight } from 'lucide-react';
import { INITIAL_SUPPORTERS } from '@/lib/mockData';
import { Supporter, SupporterCrystalStyle } from '@/lib/types';
import {
  resolveSupporterStyle,
  resolveSupporterBadgeIcon,
  renderSupporterBadgeIcon,
} from '@/lib/supporterUI';

const CRYSTAL_THEME: Record<
  SupporterCrystalStyle,
  {
    cardClass: string;
    orbTop: string;
    orbBottom: string;
    topLine: string;
    badgeClass: string;
    sparkleClass: string;
    avatarClass: string;
    titleClass: string;
    dividerClass: string;
    linkClass: string;
  }
> = {
  crimson: {
    cardClass: 'crimson-crystal-card',
    orbTop: 'bg-lycoris-500/20 group-hover:bg-lycoris-500/35',
    orbBottom: 'bg-lycoris-700/20 group-hover:bg-lycoris-600/35',
    topLine: 'via-lycoris-300/70',
    badgeClass:
      'bg-lycoris-950/80 border border-lycoris-400/50 text-lycoris-200 shadow-sm backdrop-blur-md',
    sparkleClass: 'text-lycoris-400 animate-pulse',
    avatarClass: 'border-2 border-lycoris-400/70 shadow-lycoris-glow',
    titleClass: 'text-white group-hover:text-lycoris-300 text-glow',
    dividerClass: 'border-lycoris-500/25',
    linkClass: 'text-lycoris-300 hover:text-white',
  },
  gold: {
    cardClass: 'gold-crystal-card',
    orbTop: 'bg-gothic-gold/25 group-hover:bg-gothic-gold/40',
    orbBottom: 'bg-amber-600/20 group-hover:bg-amber-500/35',
    topLine: 'via-amber-300/80',
    badgeClass:
      'bg-amber-950/80 border border-gothic-gold/60 text-amber-200 shadow-sm backdrop-blur-md',
    sparkleClass: 'text-gothic-gold animate-pulse',
    avatarClass: 'border-2 border-gothic-gold/80 shadow-gold-glow',
    titleClass: 'text-white group-hover:text-gothic-gold gold-glow',
    dividerClass: 'border-gothic-gold/30',
    linkClass: 'text-gothic-gold hover:text-white',
  },
  purple: {
    cardClass: 'purple-crystal-card',
    orbTop: 'bg-purple-500/25 group-hover:bg-purple-500/40',
    orbBottom: 'bg-purple-800/20 group-hover:bg-purple-600/35',
    topLine: 'via-purple-300/80',
    badgeClass:
      'bg-purple-950/80 border border-purple-400/60 text-purple-200 shadow-sm backdrop-blur-md',
    sparkleClass: 'text-purple-400 animate-pulse',
    avatarClass: 'border-2 border-purple-400/80 shadow-[0_0_16px_rgba(168,85,247,0.45)]',
    titleClass: 'text-white group-hover:text-purple-300 purple-glow',
    dividerClass: 'border-purple-500/25',
    linkClass: 'text-purple-300 hover:text-white',
  },
  blue: {
    cardClass: 'blue-crystal-card',
    orbTop: 'bg-sky-500/25 group-hover:bg-sky-400/40',
    orbBottom: 'bg-blue-700/20 group-hover:bg-blue-500/35',
    topLine: 'via-sky-300/80',
    badgeClass:
      'bg-sky-950/80 border border-sky-400/60 text-sky-200 shadow-sm backdrop-blur-md',
    sparkleClass: 'text-sky-400 animate-pulse',
    avatarClass: 'border-2 border-sky-400/80 shadow-[0_0_16px_rgba(56,189,248,0.45)]',
    titleClass: 'text-white group-hover:text-sky-300 blue-glow',
    dividerClass: 'border-sky-500/25',
    linkClass: 'text-sky-300 hover:text-white',
  },
  pink: {
    cardClass: 'pink-crystal-card',
    orbTop: 'bg-pink-500/25 group-hover:bg-pink-400/40',
    orbBottom: 'bg-pink-700/20 group-hover:bg-pink-500/35',
    topLine: 'via-pink-300/80',
    badgeClass:
      'bg-pink-950/80 border border-pink-400/60 text-pink-200 shadow-sm backdrop-blur-md',
    sparkleClass: 'text-pink-400 animate-pulse',
    avatarClass: 'border-2 border-pink-400/80 shadow-[0_0_16px_rgba(244,114,182,0.45)]',
    titleClass: 'text-white group-hover:text-pink-300 pink-glow',
    dividerClass: 'border-pink-500/25',
    linkClass: 'text-pink-300 hover:text-white',
  },
  none: {
    cardClass:
      'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 hover:border-gothic-gold/50 hover:shadow-gold-glow',
    orbTop: '',
    orbBottom: '',
    topLine: '',
    badgeClass: 'bg-zinc-900 border border-gothic-gold/30 text-gothic-gold',
    sparkleClass: 'text-gothic-gold/70',
    avatarClass: 'border border-gothic-gold/40',
    titleClass: 'text-white group-hover:text-gothic-gold',
    dividerClass: 'border-zinc-800',
    linkClass: 'text-gothic-gold hover:text-white',
  },
};

export default function SupportersSection() {
  const [supporters, setSupporters] = useState<Supporter[]>(INITIAL_SUPPORTERS);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isInteractingRef = useRef(false);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const dragMovedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    fetch('/api/supporters', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => Array.isArray(data) && setSupporters(data))
      .catch(() => {});
  }, []);

  // Garante cards suficientes em uma metade para cobrir qualquer tela sem espaços vazios
  const repeatCount = supporters.length > 0 ? Math.max(2, Math.ceil(6 / supporters.length)) : 2;
  const halfList: Supporter[] = [];
  for (let i = 0; i < repeatCount; i++) {
    halfList.push(...supporters);
  }
  const trackItems = [...halfList, ...halfList];

  // Auto-scroll contínuo em loop infinito enquanto a pessoa não arrasta / não interage
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || supporters.length === 0) return;

    let rafId: number;
    let lastTs = performance.now();
    // Velocidade suave (~42 px por segundo)
    const speedPxPerSec = 42;
    let subPixelAccumulator = 0;

    const normalizeLoop = () => {
      const halfWidth = el.scrollWidth / 2;
      if (halfWidth <= 0) return;
      if (el.scrollLeft >= halfWidth) {
        el.scrollLeft -= halfWidth;
      } else if (el.scrollLeft <= 0 && isDraggingRef.current) {
        el.scrollLeft += halfWidth;
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.064, (now - lastTs) / 1000);
      lastTs = now;

      if (!isInteractingRef.current && !isHoveredRef.current && !isDraggingRef.current) {
        subPixelAccumulator += speedPxPerSec * dt;
        if (subPixelAccumulator >= 0.5) {
          el.scrollLeft += subPixelAccumulator;
          subPixelAccumulator = 0;
          normalizeLoop();
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [supporters]);

  if (supporters.length === 0) return null;

  const scheduleResume = (delay = 1400) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, delay);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    isInteractingRef.current = true;
    dragMovedRef.current = false;
    setGrabbing(true);
    dragStartXRef.current = e.pageX;
    dragStartScrollRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.pageX - dragStartXRef.current;
    if (Math.abs(dx) > 5) {
      dragMovedRef.current = true;
    }
    e.preventDefault();
    const halfWidth = el.scrollWidth / 2;
    let nextScroll = dragStartScrollRef.current - dx;
    if (halfWidth > 0) {
      while (nextScroll < 0) nextScroll += halfWidth;
      while (nextScroll >= halfWidth) nextScroll -= halfWidth;
    }
    el.scrollLeft = nextScroll;
  };

  const endMouseDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setGrabbing(false);
    scheduleResume(1200);
  };

  const handleTouchStart = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    isInteractingRef.current = true;
  };

  const handleTouchEnd = () => {
    scheduleResume(1400);
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const halfWidth = el.scrollWidth / 2;
    if (halfWidth <= 0) return;
    if (el.scrollLeft >= halfWidth) {
      el.scrollLeft -= halfWidth;
    }
  };

  return (
    <section id="apoiadores" className="relative py-16 sm:py-28 w-full max-w-full overflow-hidden z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-10 sm:mb-16 px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lycoris-950/70 border border-gothic-gold/30 text-gothic-gold text-xs font-semibold uppercase tracking-widest">
            <Award className="w-3.5 h-3.5" />
            Gratidão e Parcerias
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Nossos <span className="text-gothic-gold">Apoiadores</span>
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-gothic-gold" />
            <div className="w-2 h-2 rotate-45 bg-gothic-gold shadow-gold-glow" />
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-gothic-gold" />
          </div>
          <p className="font-sans text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Expressamos nossa sincera admiração aos criadores e projetos que apoiam as noites e o desenvolvimento contínuo da comunidade Lycoris Garden.
          </p>
          <div className="pt-2">
            <Link
              href="/apoiadores"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-zinc-900/90 hover:bg-gothic-gold/15 border border-gothic-gold/35 hover:border-gothic-gold text-gothic-gold text-xs font-semibold transition-all shadow-sm"
            >
              <span>Ver Página Completa de Apoiadores ({supporters.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Carrossel Contínuo + Arrastável Manualmente */}
        <div className="relative w-full overflow-hidden py-4">
          {/* Fade suave nas bordas laterais */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-32 bg-gradient-to-r from-gothic-bg to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-32 bg-gradient-to-l from-gothic-bg to-transparent z-20" />

          <div
            ref={scrollerRef}
            onMouseEnter={() => {
              isHoveredRef.current = true;
            }}
            onMouseLeave={() => {
              isHoveredRef.current = false;
              endMouseDrag();
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={endMouseDrag}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onScroll={handleScroll}
            className={`no-scrollbar flex gap-4 sm:gap-6 px-3 overflow-x-auto select-none ${
              grabbing ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {trackItems.map((supporter, idx) => {
              const style = resolveSupporterStyle(supporter);
              const t = CRYSTAL_THEME[style];
              const isCrystal = style !== 'none';

              return (
                <div
                  key={`${supporter.id || supporter.name}-${idx}`}
                  className={`group relative w-[270px] sm:w-[370px] shrink-0 rounded-2xl p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 overflow-hidden ${t.cardClass}`}
                >
                  {/* Reflexo Cristal e Brilho de Fundo */}
                  {isCrystal ? (
                    <>
                      <div
                        className={`pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl transition-all duration-500 ${t.orbTop}`}
                      />
                      <div
                        className={`pointer-events-none absolute -bottom-12 -left-12 w-36 h-36 rounded-full blur-3xl transition-all duration-500 ${t.orbBottom}`}
                      />
                      <div
                        className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent to-transparent ${t.topLine}`}
                      />
                    </>
                  ) : (
                    <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-gothic-gold/5 rounded-full blur-3xl group-hover:bg-gothic-gold/15 transition-all" />
                  )}

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${t.badgeClass}`}
                      >
                        {renderSupporterBadgeIcon(
                          resolveSupporterBadgeIcon(supporter),
                          `w-3.5 h-3.5 shrink-0 ${t.sparkleClass.replace('animate-pulse', '').trim()}`
                        )}
                        {supporter.role}
                      </span>
                      <Sparkles className={`w-4 h-4 ${t.sparkleClass}`} />
                    </div>

                    <div className="flex items-center gap-4">
                      {supporter.avatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={supporter.avatar}
                          alt={supporter.name}
                          draggable={false}
                          className={`w-12 h-12 rounded-full object-cover shrink-0 ${t.avatarClass}`}
                        />
                      )}
                      <h3
                        className={`font-serif text-2xl sm:text-3xl font-bold transition-colors truncate ${t.titleClass}`}
                      >
                        {supporter.name}
                      </h3>
                    </div>

                    {supporter.tagline && (
                      <p className="font-sans text-sm text-zinc-200/90 leading-relaxed line-clamp-2">
                        {supporter.tagline}
                      </p>
                    )}
                  </div>

                  <div className={`relative z-10 pt-5 mt-5 border-t ${t.dividerClass}`}>
                    <a
                      href={supporter.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      draggable={false}
                      onClick={(e) => {
                        if (dragMovedRef.current) {
                          e.preventDefault();
                        }
                      }}
                      className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors group-hover:translate-x-1 duration-200 ${t.linkClass}`}
                    >
                      <span>Conheça</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
