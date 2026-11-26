"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Calendar, ChevronDown, Flame } from 'lucide-react';
import { INITIAL_HERO_STATS } from '@/lib/mockData';
import { HeroStat } from '@/lib/types';

const COLOR_CLASS: Record<string, string> = {
  'lycoris-400': 'text-lycoris-400',
  'gothic-gold': 'text-gothic-gold',
  white: 'text-white',
  'lycoris-500': 'text-lycoris-500',
};

export default function Hero() {
  const [stats, setStats] = useState<HeroStat[]>(INITIAL_HERO_STATS);

  useEffect(() => {
    fetch('/api/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setStats(data);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Imagem de Fundo com Vinheta e Gradiente Gótico */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/banner.jpg"
          alt="Lycoris Garden Banner"
          fill
          priority
          className="object-cover object-center opacity-30 filter brightness-75 contrast-125 blur-[0.8px] scale-[1.01]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gothic-bg/80 via-gothic-bg/70 to-gothic-bg" />
        <div className="absolute inset-0 bg-radial-vignette opacity-80" />
      </div>

      {/* Conteúdo Central */}
      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        {/* Badge Místico */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lycoris-950/80 border border-lycoris-700/50 backdrop-blur-md shadow-lycoris-glow animate-float">
          <Flame className="w-4 h-4 text-lycoris-500 animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-lycoris-300 font-semibold">
            VRChat Community • Red Spider Lily
          </span>
        </div>

        {/* Título Principal */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="font-serif text-4xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-2xl leading-none">
            LYCORIS <span className="text-transparent bg-clip-text bg-gradient-to-r from-lycoris-400 via-lycoris-500 to-lycoris-700">GARDEN</span>
          </h1>
          <p className="font-serif italic text-base sm:text-2xl text-gothic-gold font-light tracking-wide max-w-2xl mx-auto drop-shadow px-2">
            &ldquo;Lycoris‚ um jardim onde a vida e a morte se encontram.&rdquo;
          </p>
        </div>

        {/* Descrição da Comunidade */}
        <div className="font-sans text-sm sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed font-normal space-y-1.5 sm:space-y-2">
          <p>• Instâncias com DJs</p>
          <p>• Sorteios</p>
          <p>• Eventos e atividades especiais</p>
          <p>• Uma comunidade para conhecer pessoas e criar memórias</p>

          <p className="font-serif italic text-lycoris-300 pt-2 sm:pt-3 text-base sm:text-lg">
            &ldquo;Entre no jardim, e se torne um Lírio.&rdquo;
          </p>
        </div>

        {/* Botões de Ação (CTAs) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
          <a
            href="https://vrc.group/LYCORI.7672"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 active:scale-[0.98] text-white font-semibold text-sm sm:text-base shadow-lycoris-glow hover:shadow-lycoris-glow-lg transition-all duration-300 sm:hover:scale-[1.02] border border-lycoris-400/40"
          >
            <span>Filiação ao Grupo no VRChat</span>
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-lycoris-200" />
          </a>

          <a
            href="#eventos"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-[0.98] text-zinc-200 hover:text-white font-medium text-sm sm:text-base border border-zinc-700/60 hover:border-lycoris-700/60 backdrop-blur-sm transition-all duration-300"
          >
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-lycoris-400" />
            <span>Ver Próximos Eventos</span>
          </a>
        </div>

        {/* Destaques / Estatísticas Rápidas (Editáveis via /admin) */}
        <div className="pt-6 sm:pt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {stats.map((item, idx) => {
            const colorCls =
              COLOR_CLASS[item.color || ''] ||
              ['text-lycoris-400', 'text-gothic-gold', 'text-white', 'text-lycoris-500'][idx % 4];
            return (
              <div
                key={item.id || idx}
                className="group relative overflow-hidden p-3.5 sm:p-4 rounded-xl bg-zinc-950/60 hover:bg-gradient-to-b hover:from-lycoris-950/50 hover:to-zinc-950/90 border border-zinc-800/80 hover:border-lycoris-500/60 backdrop-blur-sm flex flex-col justify-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lycoris-glow cursor-default"
              >
                <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 bg-lycoris-500/0 group-hover:bg-lycoris-500/20 rounded-full blur-2xl transition-all duration-300" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lycoris-400/0 group-hover:via-lycoris-400/60 to-transparent transition-all duration-300" />
                <div className={`relative z-10 font-serif text-xl sm:text-3xl font-bold leading-tight transition-transform duration-300 group-hover:scale-105 ${colorCls}`}>
                  {item.value}
                </div>
                <div className="relative z-10 text-[11px] sm:text-xs text-zinc-400 group-hover:text-zinc-200 tracking-wider uppercase mt-1 transition-colors duration-300">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Indicador de Rolagem */}
        <div className="pt-8 flex justify-center">
          <a
            href="#sobre"
            className="text-zinc-500 hover:text-lycoris-400 transition-colors p-2 rounded-full hover:bg-zinc-900/50 animate-bounce"
            aria-label="Rolar para a seção sobre"
          >
            <ChevronDown className="w-6 h-6" />
          </a>
        </div>
      </div>
    </section>
  );
}
