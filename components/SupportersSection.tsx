"use client";

import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, Award } from 'lucide-react';
import { INITIAL_SUPPORTERS } from '@/lib/mockData';
import { Supporter } from '@/lib/types';

export default function SupportersSection() {
  const [supporters, setSupporters] = useState<Supporter[]>(INITIAL_SUPPORTERS);

  useEffect(() => {
    fetch('/api/supporters', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => Array.isArray(data) && setSupporters(data))
      .catch(() => {});
  }, []);

  if (supporters.length === 0) return null;

  // Garante cards suficientes em uma metade para cobrir qualquer tela sem espaços vazios
  const repeatCount = Math.max(2, Math.ceil(6 / supporters.length));
  const halfList: Supporter[] = [];
  for (let i = 0; i < repeatCount; i++) {
    halfList.push(...supporters);
  }
  // Duplica a metade para que translate3d(-50%) crie um loop infinito perfeito
  const trackItems = [...halfList, ...halfList];
  const durationSeconds = Math.max(28, halfList.length * 9);

  return (
    <section id="apoiadores" className="relative py-16 sm:py-28 max-w-7xl mx-auto z-10 overflow-hidden">
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
      </div>

      {/* Carrossel Contínuo */}
      <div className="supporters-marquee-wrapper relative w-full overflow-hidden py-4">
        {/* Fade suave nas bordas laterais */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-32 bg-gradient-to-r from-gothic-bg to-transparent z-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-32 bg-gradient-to-l from-gothic-bg to-transparent z-20" />

        <div
          className="supporters-marquee-track gap-4 sm:gap-6 px-3"
          style={{ ['--marquee-duration' as any]: `${durationSeconds}s` }}
        >
          {trackItems.map((supporter, idx) => (
            <div
              key={`${supporter.id || supporter.name}-${idx}`}
              className="group relative w-[270px] sm:w-[370px] shrink-0 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 hover:border-gothic-gold/50 p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-gold-glow hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gothic-gold/5 rounded-full blur-3xl group-hover:bg-gothic-gold/15 transition-all" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-gothic-gold/30 text-gothic-gold">
                    {supporter.role}
                  </span>
                  <Sparkles className="w-4 h-4 text-gothic-gold/70" />
                </div>

                <div className="flex items-center gap-4">
                  {supporter.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={supporter.avatar}
                      alt={supporter.name}
                      className="w-12 h-12 rounded-full object-cover border border-gothic-gold/40 shrink-0"
                    />
                  )}
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white group-hover:text-gothic-gold transition-colors truncate">
                    {supporter.name}
                  </h3>
                </div>

                {supporter.tagline && (
                  <p className="font-sans text-sm text-zinc-300 leading-relaxed line-clamp-2">
                    {supporter.tagline}
                  </p>
                )}
              </div>

              <div className="pt-5 mt-5 border-t border-zinc-800">
                <a
                  href={supporter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gothic-gold hover:text-white transition-colors group-hover:translate-x-1 duration-200"
                >
                  <span>Conhecer Projeto</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
