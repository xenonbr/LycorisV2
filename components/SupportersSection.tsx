"use client";

import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, Award, Crown } from 'lucide-react';
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
            {trackItems.map((supporter, idx) => {
              const isCrimsonOwner = Boolean(
                supporter.is_owner || (supporter.sort_order ?? 0) < 0
              );

              return (
                <div
                  key={`${supporter.id || supporter.name}-${idx}`}
                  className={`group relative w-[270px] sm:w-[370px] shrink-0 rounded-2xl p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                    isCrimsonOwner
                      ? 'crimson-crystal-card'
                      : 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 hover:border-gothic-gold/50 hover:shadow-gold-glow'
                  }`}
                >
                  {/* Reflexo Cristal e Brilho de Fundo */}
                  {isCrimsonOwner ? (
                    <>
                      <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-lycoris-500/20 rounded-full blur-3xl group-hover:bg-lycoris-500/35 transition-all duration-500" />
                      <div className="pointer-events-none absolute -bottom-12 -left-12 w-36 h-36 bg-lycoris-700/20 rounded-full blur-3xl group-hover:bg-lycoris-600/35 transition-all duration-500" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lycoris-300/70 to-transparent" />
                    </>
                  ) : (
                    <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-gothic-gold/5 rounded-full blur-3xl group-hover:bg-gothic-gold/15 transition-all" />
                  )}

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                          isCrimsonOwner
                            ? 'bg-lycoris-950/80 border border-lycoris-400/50 text-lycoris-200 shadow-sm backdrop-blur-md'
                            : 'bg-zinc-900 border border-gothic-gold/30 text-gothic-gold'
                        }`}
                      >
                        {isCrimsonOwner && <Crown className="w-3.5 h-3.5 text-lycoris-400" />}
                        {supporter.role}
                      </span>
                      <Sparkles
                        className={`w-4 h-4 ${
                          isCrimsonOwner
                            ? 'text-lycoris-400 animate-pulse'
                            : 'text-gothic-gold/70'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      {supporter.avatar && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={supporter.avatar}
                          alt={supporter.name}
                          className={`w-12 h-12 rounded-full object-cover shrink-0 ${
                            isCrimsonOwner
                              ? 'border-2 border-lycoris-400/70 shadow-lycoris-glow'
                              : 'border border-gothic-gold/40'
                          }`}
                        />
                      )}
                      <h3
                        className={`font-serif text-2xl sm:text-3xl font-bold transition-colors truncate ${
                          isCrimsonOwner
                            ? 'text-white group-hover:text-lycoris-300 text-glow'
                            : 'text-white group-hover:text-gothic-gold'
                        }`}
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

                  <div
                    className={`relative z-10 pt-5 mt-5 border-t ${
                      isCrimsonOwner ? 'border-lycoris-500/25' : 'border-zinc-800'
                    }`}
                  >
                    <a
                      href={supporter.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors group-hover:translate-x-1 duration-200 ${
                        isCrimsonOwner
                          ? 'text-lycoris-300 hover:text-white'
                          : 'text-gothic-gold hover:text-white'
                      }`}
                    >
                      <span>Conhecer Projeto</span>
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
