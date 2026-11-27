"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { INITIAL_PARTNER_STORES } from '@/lib/mockData';
import { PartnerStore, SawCatalogItem, SupporterCrystalStyle } from '@/lib/types';
import {
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Search,
  Package,
} from 'lucide-react';

const CARD_STYLE: Record<
  SupporterCrystalStyle,
  {
    cardClass: string;
    badgeClass: string;
    accentClass: string;
    buttonClass: string;
  }
> = {
  gold: {
    cardClass: 'gold-crystal-card',
    badgeClass: 'bg-amber-950/80 border-gothic-gold/50 text-gothic-gold',
    accentClass: 'text-gothic-gold',
    buttonClass: 'bg-gothic-gold hover:bg-amber-400 text-black shadow-gold-glow',
  },
  crimson: {
    cardClass: 'crimson-crystal-card',
    badgeClass: 'bg-lycoris-950/80 border-lycoris-400/50 text-lycoris-200',
    accentClass: 'text-lycoris-400',
    buttonClass: 'bg-lycoris-600 hover:bg-lycoris-500 text-white shadow-lycoris-glow',
  },
  purple: {
    cardClass: 'purple-crystal-card',
    badgeClass: 'bg-purple-950/80 border-purple-400/50 text-purple-200',
    accentClass: 'text-purple-300',
    buttonClass: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
  blue: {
    cardClass: 'blue-crystal-card',
    badgeClass: 'bg-sky-950/80 border-sky-400/50 text-sky-200',
    accentClass: 'text-sky-300',
    buttonClass: 'bg-sky-500 hover:bg-sky-400 text-black',
  },
  pink: {
    cardClass: 'pink-crystal-card',
    badgeClass: 'bg-pink-950/80 border-pink-400/50 text-pink-200',
    accentClass: 'text-pink-300',
    buttonClass: 'bg-pink-500 hover:bg-pink-400 text-black',
  },
  none: {
    cardClass:
      'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 hover:border-gothic-gold/50 hover:shadow-gold-glow',
    badgeClass: 'bg-zinc-900 border-gothic-gold/30 text-gothic-gold',
    accentClass: 'text-gothic-gold',
    buttonClass: 'bg-gothic-gold hover:bg-amber-400 text-black',
  },
};

export default function LojasParceirasPage() {
  const [stores, setStores] = useState<PartnerStore[]>(INITIAL_PARTNER_STORES);
  const [catalogItems, setCatalogItems] = useState<SawCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/stores', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/sawvr', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([storesData, itemsData]) => {
        if (Array.isArray(storesData) && storesData.length > 0) setStores(storesData);
        if (Array.isArray(itemsData)) setCatalogItems(itemsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredStores = stores.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.tagline || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.badge || '').toLowerCase().includes(q)
    );
  });

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-gothic-bg text-zinc-100">
      <Navbar />

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
            <ShoppingBag className="w-3.5 h-3.5" />
            Comércio &amp; Parceiros Verificados
          </div>
          <h1 className="font-serif text-3xl sm:text-6xl font-black text-white tracking-tight">
            Lojas <span className="text-gothic-gold">Parceiras</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-14 bg-gradient-to-r from-transparent to-gothic-gold" />
            <div className="w-2 h-2 rotate-45 bg-gothic-gold shadow-gold-glow" />
            <div className="h-[1px] w-14 bg-gradient-to-l from-transparent to-gothic-gold" />
          </div>
          <p className="font-sans text-zinc-400 text-sm sm:text-base leading-relaxed">
            Explore as lojas oficiais parceiras da comunidade Lycoris Garden. Toque em qualquer loja abaixo para abrir o catálogo completo de produtos e serviços.
          </p>
        </div>
      </section>

      <section
        style={{ '--reveal-delay': '520ms' } as React.CSSProperties}
        className="lycoris-reveal-step relative pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 flex-1 space-y-8"
      >
        {stores.length > 1 && (
          <div className="flex justify-end">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar loja parceira..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-white text-base sm:text-xs placeholder-zinc-500 focus:outline-none focus:border-gothic-gold"
              />
            </div>
          </div>
        )}

        {loading && stores.length === 0 ? (
          <div className="text-center py-20 text-xs text-zinc-500 animate-pulse">
            Carregando lojas parceiras...
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 max-w-md mx-auto space-y-2">
            <ShoppingBag className="w-9 h-9 text-gothic-gold/60 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-white">Nenhuma loja encontrada</h3>
            <p className="text-xs text-zinc-400">
              Tente buscar por outro nome de loja parceira.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredStores.map((store) => {
              const style = store.crystal_style || 'gold';
              const t = CARD_STYLE[style] || CARD_STYLE.gold;
              const storeItemsCount = catalogItems.filter(
                (i) => (i.store_id || 'sawvr') === store.id
              ).length;

              return (
                <Link
                  key={store.id}
                  href={`/lojas/${store.slug}`}
                  className={`group relative z-10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 overflow-hidden ${t.cardClass}`}
                >
                  {/* Camada base escura para bloquear as flores que caem no fundo da página */}
                  <div className="pointer-events-none absolute inset-0 z-0 bg-[#09090c]/85" />
                  {store.banner_url && (
                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={store.banner_url}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover scale-105 blur-[2.5px] opacity-45 group-hover:opacity-65 group-hover:scale-110 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/70 to-zinc-950/90" />
                    </div>
                  )}

                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1.5 backdrop-blur-md ${t.badgeClass}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>{store.badge || 'Loja Parceira Oficial'}</span>
                      </span>

                      <span className="px-2.5 py-1 rounded-full bg-black/70 border border-zinc-700/80 text-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1.5 backdrop-blur-md">
                        <Package className="w-3.5 h-3.5 text-gothic-gold" />
                        <span>
                          {storeItemsCount} {storeItemsCount === 1 ? 'item' : 'itens'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-white/20 shadow-lg shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-white/15 flex items-center justify-center shrink-0">
                          <ShoppingBag className={`w-7 h-7 ${t.accentClass}`} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="font-serif text-2xl sm:text-3xl font-black text-white group-hover:text-gothic-gold transition-colors truncate uppercase">
                          {store.name}
                        </h2>
                        {store.tagline && (
                          <p className={`text-xs sm:text-sm font-medium line-clamp-1 ${t.accentClass}`}>
                            {store.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    {store.description && (
                      <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed line-clamp-3">
                        {store.description}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 pt-5 mt-6 border-t border-white/10 flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Loja Verificada</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all group-hover:translate-x-1 ${t.buttonClass}`}
                    >
                      <span>Abrir Catálogo</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
