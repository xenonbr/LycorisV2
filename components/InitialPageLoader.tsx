"use client";

import React, { useEffect, useState } from 'react';
import LycorisParticles from '@/components/LycorisParticles';

export default function InitialPageLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  // 'dark': tela preta com as pétalas em primeiro plano + Flor Lycoris centralizada com glow e título "Lycoris Garden"
  // 'revealing': as pétalas do primeiro plano recuam e se dissipam gradualmente (scale + blur + fade) enquanto as pétalas de segundo plano surgem atrás do conteúdo
  // 'done': animação concluída com apenas a camada de segundo plano ativa atrás do site
  const [phase, setPhase] = useState<'dark' | 'revealing' | 'done'>('dark');

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setPhase('done');
      return;
    }

    let alreadyVisited = false;
    try {
      alreadyVisited = sessionStorage.getItem('lycoris_intro_seen') === '1';
      sessionStorage.setItem('lycoris_intro_seen', '1');
    } catch {
      // ignora bloqueios de storage
    }

    const darkHoldMs = alreadyVisited ? 550 : 1450;
    const revealDurationMs = alreadyVisited ? 1400 : 2100;

    const revealTimer = window.setTimeout(() => {
      setPhase('revealing');
    }, darkHoldMs);

    const doneTimer = window.setTimeout(() => {
      setPhase('done');
    }, darkHoldMs + revealDurationMs);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <>
      {/* Camada de Segundo Plano (z-[1]): sempre atrás dos cards e textos (z-10),
          com leve desfoque de profundidade (~5%) */}
      <LycorisParticles
        className={`pointer-events-none fixed inset-0 h-full w-full z-[1] blur-[0.7px] transition-opacity duration-[1600ms] ease-out ${
          phase === 'dark' ? 'opacity-0' : 'opacity-75'
        }`}
      />

      {/* Camada de Primeiro Plano da Abertura (z-[85]):
          Durante a fase 'dark' fica nítida em primeiro plano;
          Ao entrar em 'revealing', recua suavemente para trás (scale-95 + blur + opacity-0)
          em crossfade gradual com a camada de segundo plano, sem corte brusco. */}
      {phase !== 'done' && (
        <LycorisParticles
          className={`pointer-events-none fixed inset-0 h-full w-full z-[85] transition-all ease-in-out ${
            phase === 'dark'
              ? 'opacity-95 scale-100 blur-none duration-500'
              : 'opacity-0 scale-95 blur-[2.5px] duration-[1750ms]'
          }`}
        />
      )}

      {/* Cortina Preta Inicial + Flor de Lycoris Centralizada com Glow + Nome Lycoris Garden */}
      {phase !== 'done' && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-[80] bg-[#050505] flex items-center justify-center transition-opacity ease-out ${
            phase === 'dark' ? 'opacity-100 duration-300' : 'opacity-0 duration-[1750ms]'
          }`}
        >
          {/* Emblema Central da Abertura (Fica acima das pétalas com z-[90]) */}
          <div
            className={`relative z-[90] flex flex-col items-center justify-center px-6 text-center transition-all ease-out ${
              phase === 'dark'
                ? 'opacity-100 scale-100 translate-y-0 duration-700'
                : 'opacity-0 scale-105 -translate-y-2 duration-[1100ms]'
            }`}
          >
            {/* Halo luminoso carmesim pulsante atrás da flor */}
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-lycoris-600/25 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full bg-lycoris-500/20 blur-2xl" />

            {/* Flor Lycoris Centralizada com Efeito Glow */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/lycoris-flower.png"
              alt="Lycoris Radiata"
              className="relative w-32 h-32 sm:w-44 sm:h-44 object-contain drop-shadow-[0_0_25px_rgba(225,29,72,0.85)] animate-float"
            />

            {/* Nome Lycoris Garden com Brilho Carmesim */}
            <div className="relative mt-4 sm:mt-5 space-y-1.5">
              <span className="block font-serif text-2xl sm:text-4xl font-black tracking-[0.18em] text-white text-glow">
                LYCORIS <span className="text-lycoris-500">GARDEN</span>
              </span>
              <div className="flex items-center justify-center gap-2.5 opacity-80">
                <span className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-lycoris-500" />
                <span className="w-1.5 h-1.5 rotate-45 bg-lycoris-500 shadow-lycoris-glow" />
                <span className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-lycoris-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Página (sem opacity no wrapper externo para nunca criar stacking context z-0 abaixo de z-[1]) */}
      <div data-intro-phase={phase} className="lycoris-intro-stage">
        {children}
      </div>
    </>
  );
}
