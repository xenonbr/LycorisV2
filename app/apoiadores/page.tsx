"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { INITIAL_SUPPORTERS } from '@/lib/mockData';
import { Supporter, SupporterCrystalStyle } from '@/lib/types';
import {
  resolveSupporterStyle,
  resolveSupporterBadgeIcon,
  renderSupporterBadgeIcon,
} from '@/lib/supporterUI';
import {
  Award,
  ExternalLink,
  Sparkles,
  Search,
  ArrowLeft,
  HeartHandshake,
  ShoppingBag,
} from 'lucide-react';

const CRYSTAL_THEME: Record<
  SupporterCrystalStyle,
  {
    cardClass: string;
    bannerOverlay: string;
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
    bannerOverlay: 'bg-gradient-to-b from-lycoris-950/60 via-zinc-950/65 to-zinc-950/90',
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
    bannerOverlay: 'bg-gradient-to-b from-amber-950/55 via-zinc-950/65 to-zinc-950/90',
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
    bannerOverlay: 'bg-gradient-to-b from-purple-950/55 via-zinc-950/65 to-zinc-950/90',
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
    bannerOverlay: 'bg-gradient-to-b from-sky-950/55 via-zinc-950/65 to-zinc-950/90',
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
    bannerOverlay: 'bg-gradient-to-b from-pink-950/55 via-zinc-950/65 to-zinc-950/90',
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
    bannerOverlay: 'bg-gradient-to-b from-zinc-950/55 via-zinc-950/65 to-zinc-950/90',
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

export default function ApoiadoresPage() {
  const [supporters, setSupporters] = useState<Supporter[]>(INITIAL_SUPPORTERS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('Todos');

  useEffect(() => {
    fetch('/api/supporters', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setSupporters(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roles = [
    'Todos',
    ...Array.from(new Set(supporters.map((s) => s.role).filter(Boolean))),
  ];

  const filtered = supporters.filter((s) => {
    const matchRole = selectedRole === 'Todos' || s.role === selectedRole;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.tagline || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-gothic-bg text-zinc-100">
      <Navbar />

      {/* Cabeçalho da Página de Apoiadores & Parceiros */}
      <section className="relative pt-28 sm:pt-36 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10">
        <div
          style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
          className="lycoris-reveal-step mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-lycoris-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a Página Inicial</span>
          </Link>
        </div>

        <div
          style={{ '--reveal-delay': '340ms' } as React.CSSProperties}
          className="lycoris-reveal-step text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lycoris-950/70 border border-gothic-gold/30 text-gothic-gold text-xs font-semibold uppercase tracking-widest">
            <Award className="w-3.5 h-3.5" />
            Gratidão, Criadores e Parcerias
          </div>
          <h1 className="font-serif text-3xl sm:text-6xl font-black text-white tracking-tight">
            Nossos <span className="text-gothic-gold">Apoiadores &amp; Parceiros</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-14 bg-gradient-to-r from-transparent to-gothic-gold" />
            <div className="w-2 h-2 rotate-45 bg-gothic-gold shadow-gold-glow" />
            <div className="h-[1px] w-14 bg-gradient-to-l from-transparent to-gothic-gold" />
          </div>
          <p className="font-sans text-zinc-400 text-sm sm:text-base leading-relaxed">
            Conheça todos os criadores, streamers, grupos e parceiros que fortalecem as noites e o crescimento contínuo do santuário Lycoris Garden no VRChat.
          </p>
        </div>
      </section>

      {/* Filtros, Busca e Grade Completa de Apoiadores */}
      <section
        style={{ '--reveal-delay': '540ms' } as React.CSSProperties}
        className="lycoris-reveal-step relative pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 flex-1 space-y-8"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Filtro por Título/Papel */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedRole === role
                    ? 'bg-gothic-gold/15 border-gothic-gold text-gothic-gold shadow-gold-glow'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar apoiador ou parceiro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-white text-base sm:text-xs placeholder-zinc-500 focus:outline-none focus:border-gothic-gold"
            />
          </div>
        </div>

        {loading && supporters.length === 0 ? (
          <div className="text-center py-20 text-xs text-zinc-500 animate-pulse">
            Carregando apoiadores e parceiros...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 max-w-md mx-auto space-y-2">
            <HeartHandshake className="w-9 h-9 text-gothic-gold/60 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-white">
              Nenhum parceiro encontrado
            </h3>
            <p className="text-xs text-zinc-400">
              Tente buscar por outro nome ou selecione a categoria &ldquo;Todos&rdquo;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((supporter, idx) => {
              const style = resolveSupporterStyle(supporter);
              const t = CRYSTAL_THEME[style];
              const isCrystal = style !== 'none';
              const isSawPartner = supporter.name.toLowerCase().includes('saw');
              const hasCustomBanner = Boolean(supporter.banner_url && supporter.banner_url.trim());

              return (
                <div
                  key={supporter.id || `${supporter.name}-${idx}`}
                  className={`group relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 overflow-hidden ${t.cardClass}`}
                >
                  {/* Plano de Fundo Desfocado Exclusivo da Página de Apoiadores */}
                  {hasCustomBanner && (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={supporter.banner_url!}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover scale-105 blur-[2.5px] opacity-55 group-hover:opacity-70 group-hover:scale-110 transition-all duration-500"
                      />
                      <div className={`absolute inset-0 ${t.bannerOverlay}`} />
                    </div>
                  )}

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
                          className={`w-14 h-14 rounded-full object-cover shrink-0 ${t.avatarClass}`}
                        />
                      )}
                      <h3
                        className={`font-serif text-2xl sm:text-3xl font-bold transition-colors truncate ${t.titleClass}`}
                      >
                        {supporter.name}
                      </h3>
                    </div>

                    {supporter.tagline && (
                      <p className="font-sans text-sm text-zinc-200/90 leading-relaxed">
                        {supporter.tagline}
                      </p>
                    )}
                  </div>

                  <div
                    className={`relative z-10 pt-5 mt-6 border-t flex items-center justify-between gap-3 flex-wrap ${t.dividerClass}`}
                  >
                    <a
                      href={supporter.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors group-hover:translate-x-1 duration-200 ${t.linkClass}`}
                    >
                      <span>Conheça</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {isSawPartner && (
                      <Link
                        href="/sawvr"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gothic-gold/15 hover:bg-gothic-gold/25 border border-gothic-gold/40 text-gothic-gold text-xs font-semibold transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Ver Catálogo VR</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
