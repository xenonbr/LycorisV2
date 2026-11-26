"use client";

import React, { useEffect, useState } from 'react';
import LycorisParticles from '@/components/LycorisParticles';

export default function InitialPageLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  // 'dark': tela 100% preta apenas com pétalas caindo
  // 'revealing': fade-in suave e sutil dos conteúdos
  // 'done': animação concluída
  const [phase, setPhase] = useState<'dark' | 'revealing' | 'done'>('dark');

  useEffect(() => {
    // Respeita preferência de movimento reduzido
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setPhase('done');
      return;
    }

    // Se já carregou nesta sessão de navegação (ex: indo para /apoiadores ou /sawvr),
    // faz uma transição mais rápida para não atrasar cliques internos
    let alreadyVisited = false;
    try {
      alreadyVisited = sessionStorage.getItem('lycoris_intro_seen') === '1';
      sessionStorage.setItem('lycoris_intro_seen', '1');
    } catch {
      // ignora bloqueios de storage
    }

    const darkHoldMs = alreadyVisited ? 300 : 1050;
    const revealDurationMs = alreadyVisited ? 1300 : 2350;

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
      {/* Camada Global de Pétalas de Lycoris:
          Fica nítida e em destaque acima da cortina preta durante a abertura (z-[85]),
          e após a animação finalizar retorna ao fundo da página (z-[1]) com um desfoque sutil de ~5% (blur-[0.7px]). */}
      <LycorisParticles
        className={`pointer-events-none fixed inset-0 h-full w-full transition-all duration-1000 ${
          phase === 'done'
            ? 'z-[1] opacity-75 blur-[0.7px]'
            : 'z-[85] opacity-95 blur-none'
        }`}
      />

      {/* Cortina Preta Inicial que desaparece suavemente revelando a página */}
      {phase !== 'done' && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-[80] bg-[#050505] transition-opacity ease-out ${
            phase === 'dark' ? 'opacity-100 duration-300' : 'opacity-0 duration-[1800ms]'
          }`}
        />
      )}

      {/* Conteúdo da Página com Fade-In Gradativo de Cima para Baixo */}
      <div
        data-intro-phase={phase}
        className={`lycoris-intro-stage ${
          phase === 'done'
            ? ''
            : `transition-opacity ease-out ${
                phase === 'dark'
                  ? 'opacity-0 duration-300'
                  : 'opacity-100 duration-[1400ms]'
              }`
        }`}
      >
        {children}
      </div>
    </>
  );
}
