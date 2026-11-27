"use client";

import React, { useEffect, useState } from 'react';
import { Moon, Sparkles, Compass } from 'lucide-react';
import { INITIAL_HOME_CONTENT } from '@/lib/mockData';
import { HomePageContent } from '@/lib/types';

export default function AboutSection() {
  const [content, setContent] = useState<HomePageContent>(INITIAL_HOME_CONTENT);

  useEffect(() => {
    fetch('/api/homepage', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === 'object' && data.aboutBadge) {
          setContent((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section
      id="sobre"
      style={{ '--reveal-delay': '1220ms' } as React.CSSProperties}
      className="lycoris-reveal-step relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10"
    >
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 border border-lycoris-900/40 p-6 sm:p-14 shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lycoris-950 border border-lycoris-800/60 text-lycoris-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-lycoris-400" />
              {content.aboutBadge}
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              {content.aboutTitleStart}{' '}
              {content.aboutTitleHighlight && (
                <span className="text-lycoris-500">{content.aboutTitleHighlight}</span>
              )}{' '}
              {content.aboutTitleEnd}
            </h2>
            <p className="font-sans text-zinc-300 leading-relaxed text-sm sm:text-base whitespace-pre-line">
              {content.aboutDescription}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Bloco 1: Atmosfera (Neon Carmesim) */}
              <div className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-lycoris-950/35 via-black/70 to-black/90 border border-lycoris-500/45 hover:border-lycoris-400 shadow-[0_0_20px_-4px_rgba(225,29,72,0.45),inset_0_0_16px_rgba(225,29,72,0.12)] hover:shadow-[0_0_32px_-2px_rgba(244,63,94,0.7),inset_0_0_24px_rgba(225,29,72,0.22)] transition-all duration-300 hover:-translate-y-1">
                <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-lycoris-500/20 group-hover:bg-lycoris-500/35 rounded-full blur-2xl transition-all duration-300" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lycoris-400/80 to-transparent" />
                <div className="relative z-10 flex items-center gap-2 text-lycoris-300 font-serif font-bold text-sm tracking-wide text-glow uppercase">
                  <Moon className="w-4 h-4 text-lycoris-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.85)]" />
                  {content.block1Title}
                </div>
                <p className="relative z-10 text-xs text-zinc-300/90 mt-2 leading-relaxed">
                  {content.block1Description}
                </p>
              </div>

              {/* Bloco 2: Diversão (Neon Dourado Gótico) */}
              <div className="group relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-amber-950/25 via-black/70 to-black/90 border border-gothic-gold/45 hover:border-gothic-gold shadow-[0_0_20px_-4px_rgba(218,175,55,0.4),inset_0_0_16px_rgba(218,175,55,0.1)] hover:shadow-[0_0_32px_-2px_rgba(218,175,55,0.68),inset_0_0_24px_rgba(218,175,55,0.2)] transition-all duration-300 hover:-translate-y-1">
                <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-gothic-gold/15 group-hover:bg-gothic-gold/30 rounded-full blur-2xl transition-all duration-300" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gothic-gold/80 to-transparent" />
                <div className="relative z-10 flex items-center gap-2 text-gothic-gold font-serif font-bold text-sm tracking-wide gold-glow uppercase">
                  <Compass className="w-4 h-4 text-gothic-gold drop-shadow-[0_0_8px_rgba(218,175,55,0.85)]" />
                  {content.block2Title}
                </div>
                <p className="relative z-10 text-xs text-zinc-300/90 mt-2 leading-relaxed">
                  {content.block2Description}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border border-lycoris-600/40 shadow-lycoris-glow group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.brandImageUrl || '/images/brand-guide.jpg'}
                alt={content.brandTitle || 'Guia de Marca Lycoris Garden'}
                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
                <span className="text-[11px] uppercase tracking-widest text-lycoris-400 font-bold">
                  {content.brandEyebrow}
                </span>
                <span className="font-serif text-lg font-bold text-white">
                  {content.brandTitle}
                </span>
                <span className="text-xs text-zinc-300 mt-1">
                  {content.brandSubtitle}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
