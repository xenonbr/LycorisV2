"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PartnerStore, SawCatalogItem, SupporterCrystalStyle } from '@/lib/types';
import { INITIAL_PARTNER_STORES } from '@/lib/mockData';
import {
  ShoppingBag,
  ExternalLink,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Cpu,
  ShieldCheck,
  ArrowLeft,
  X,
} from 'lucide-react';

const STORE_THEME: Record<
  SupporterCrystalStyle,
  {
    bannerCard: string;
    topLine: string;
    orbTop: string;
    orbBottom: string;
    badge: string;
    accentText: string;
    button: string;
    itemBorder: string;
  }
> = {
  gold: {
    bannerCard: 'gold-crystal-card',
    topLine: 'via-gothic-gold/70',
    orbTop: 'bg-gothic-gold/15',
    orbBottom: 'bg-amber-600/10',
    badge: 'bg-zinc-900/90 border-gothic-gold/45 text-gothic-gold',
    accentText: 'text-gothic-gold',
    button: 'bg-gothic-gold hover:bg-amber-400 text-black shadow-gold-glow',
    itemBorder: 'hover:border-gothic-gold/50 hover:shadow-gold-glow',
  },
  crimson: {
    bannerCard: 'crimson-crystal-card',
    topLine: 'via-lycoris-400/70',
    orbTop: 'bg-lycoris-500/20',
    orbBottom: 'bg-lycoris-700/15',
    badge: 'bg-lycoris-950/85 border-lycoris-400/50 text-lycoris-200',
    accentText: 'text-lycoris-400',
    button: 'bg-lycoris-600 hover:bg-lycoris-500 text-white shadow-lycoris-glow',
    itemBorder: 'hover:border-lycoris-500/60 hover:shadow-lycoris-glow',
  },
  purple: {
    bannerCard: 'purple-crystal-card',
    topLine: 'via-purple-300/70',
    orbTop: 'bg-purple-500/20',
    orbBottom: 'bg-purple-800/15',
    badge: 'bg-purple-950/85 border-purple-400/50 text-purple-200',
    accentText: 'text-purple-300',
    button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.45)]',
    itemBorder: 'hover:border-purple-400/60 hover:shadow-[0_0_24px_-4px_rgba(168,85,247,0.45)]',
  },
  blue: {
    bannerCard: 'blue-crystal-card',
    topLine: 'via-sky-300/70',
    orbTop: 'bg-sky-500/20',
    orbBottom: 'bg-blue-700/15',
    badge: 'bg-sky-950/85 border-sky-400/50 text-sky-200',
    accentText: 'text-sky-300',
    button: 'bg-sky-500 hover:bg-sky-400 text-black shadow-[0_0_20px_rgba(56,189,248,0.45)]',
    itemBorder: 'hover:border-sky-400/60 hover:shadow-[0_0_24px_-4px_rgba(56,189,248,0.45)]',
  },
  pink: {
    bannerCard: 'pink-crystal-card',
    topLine: 'via-pink-300/70',
    orbTop: 'bg-pink-500/20',
    orbBottom: 'bg-pink-700/15',
    badge: 'bg-pink-950/85 border-pink-400/50 text-pink-200',
    accentText: 'text-pink-300',
    button: 'bg-pink-500 hover:bg-pink-400 text-black shadow-[0_0_20px_rgba(244,114,182,0.45)]',
    itemBorder: 'hover:border-pink-400/60 hover:shadow-[0_0_24px_-4px_rgba(244,114,182,0.45)]',
  },
  none: {
    bannerCard:
      'bg-gradient-to-br from-zinc-950 via-zinc-900/95 to-zinc-950 border border-gothic-gold/40 shadow-[0_0_35px_-8px_rgba(218,175,55,0.3)]',
    topLine: 'via-gothic-gold/70',
    orbTop: 'bg-gothic-gold/10',
    orbBottom: 'bg-lycoris-600/10',
    badge: 'bg-zinc-900 border-gothic-gold/40 text-gothic-gold',
    accentText: 'text-gothic-gold',
    button: 'bg-gothic-gold hover:bg-amber-400 text-black shadow-gold-glow',
    itemBorder: 'hover:border-gothic-gold/50 hover:shadow-gold-glow',
  },
};

export default function PartnerStoreCatalogView({ slug }: { slug: string }) {
  const [store, setStore] = useState<PartnerStore | null>(() => {
    const found = INITIAL_PARTNER_STORES.find((s) => s.slug === slug || s.id === slug);
    return found || null;
  });
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [items, setItems] = useState<SawCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeItem, setActiveItem] = useState<SawCatalogItem | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStoreAndItems() {
      setLoading(true);
      try {
        const [resStores, resItems] = await Promise.all([
          fetch('/api/stores', { cache: 'no-store' }),
          fetch('/api/sawvr', { cache: 'no-store' }),
        ]);
        const storesList: PartnerStore[] = resStores.ok ? await resStores.json() : INITIAL_PARTNER_STORES;
        const allItems: SawCatalogItem[] = resItems.ok ? await resItems.json() : [];

        if (!active) return;

        const targetStore =
          storesList.find(
            (s) =>
              s.slug.toLowerCase() === slug.toLowerCase() ||
              s.id.toLowerCase() === slug.toLowerCase()
          ) || null;

        if (!targetStore) {
          setStoreNotFound(true);
          setStore(null);
          setItems([]);
        } else {
          setStoreNotFound(false);
          setStore(targetStore);
          const storeItems = allItems.filter(
            (item) => (item.store_id || 'sawvr') === targetStore.id
          );
          setItems(storeItems);
        }
      } catch {
        // fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    loadStoreAndItems();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!activeItem) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [activeItem]);

  const categories = [
    'Todos',
    ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
  ];

  const filteredItems = items.filter((item) => {
    const matchCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const theme = STORE_THEME[store?.crystal_style || 'gold'] || STORE_THEME.gold;
  const defaultContact = store?.contact_url || 'https://discord.gg/V5ykbQsBAE';

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-gothic-bg text-zinc-100">
      <Navbar />

      <section
        style={{ '--reveal-delay': '240ms' } as React.CSSProperties}
        className="lycoris-reveal-step relative pt-28 sm:pt-36 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10"
      >
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/lojas"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-lycoris-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Lojas Parceiras</span>
          </Link>
        </div>

        {storeNotFound && !loading ? (
          <div className="p-12 rounded-3xl bg-zinc-950/80 border border-zinc-800 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto" />
            <h1 className="font-serif text-2xl font-bold text-white">Loja não encontrada</h1>
            <p className="text-xs text-zinc-400">
              Esta loja parceira não existe ou foi removida.
            </p>
            <Link
              href="/lojas"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 text-white text-xs font-semibold"
            >
              Ver todas as Lojas Parceiras
            </Link>
          </div>
        ) : (
          store && (
            <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-12 backdrop-blur-md ${theme.bannerCard}`}>
              {store.banner_url && (
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.banner_url}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover scale-105 blur-[2.5px] opacity-40"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/85 via-zinc-950/75 to-zinc-950/85" />
                </div>
              )}

              <div className={`pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl ${theme.orbTop}`} />
              <div className={`pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl ${theme.orbBottom}`} />
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent to-transparent ${theme.topLine}`} />

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="space-y-4 max-w-2xl">
                  {store.badge && (
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-widest ${theme.badge}`}
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>{store.badge}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-white/20 shadow-lg shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900/90 border border-white/15 flex items-center justify-center shrink-0">
                        <ShoppingBag className={`w-7 h-7 ${theme.accentText}`} />
                      </div>
                    )}
                    <div>
                      <h1 className="font-serif text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
                        {store.name}
                      </h1>
                      {store.tagline && (
                        <p className={`text-xs sm:text-sm font-medium mt-0.5 ${theme.accentText}`}>
                          {store.tagline}
                        </p>
                      )}
                    </div>
                  </div>

                  {store.description && (
                    <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed whitespace-pre-line">
                      {store.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Parceiro Verificado pela Comunidade
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className={`w-4 h-4 ${theme.accentText}`} />
                      Atendimento e Negociação Direta
                    </span>
                  </div>
                </div>

                {store.contact_url && (
                  <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                    <a
                      href={store.contact_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${theme.button}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{store.contact_label || `Falar com ${store.name}`}</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </section>

      {!storeNotFound && store && (
        <section className="relative pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 flex-1 space-y-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    selectedCategory === cat
                      ? 'bg-gothic-gold/15 border-gothic-gold text-gothic-gold shadow-gold-glow'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar produto ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-white text-base sm:text-xs placeholder-zinc-500 focus:outline-none focus:border-gothic-gold"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-xs text-zinc-500 animate-pulse">
              Carregando catálogo de {store.name}...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 max-w-lg mx-auto backdrop-blur-sm space-y-3">
              <ShoppingBag className={`w-10 h-10 mx-auto opacity-70 ${theme.accentText}`} />
              <h3 className="font-serif text-lg font-bold text-white">
                {items.length === 0
                  ? 'Nenhum anúncio publicado neste catálogo ainda'
                  : 'Nenhum item encontrado para esse filtro'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {items.length === 0
                  ? `Novos produtos e serviços de ${store.name} serão adicionados em breve. Você também pode entrar em contato diretamente com a loja!`
                  : 'Tente buscar por outro termo ou selecione a categoria "Todos".'}
              </p>
              {store.contact_url && (
                <div className="pt-2">
                  <a
                    href={store.contact_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-gothic-gold/40 text-gothic-gold text-xs font-semibold transition-colors"
                  >
                    <span>{store.contact_label || `Falar com ${store.name}`}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  onClick={() => setActiveItem(item)}
                  className={`group relative cursor-pointer rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 border transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between ${
                    item.featured
                      ? 'border-gothic-gold/50 shadow-gold-glow'
                      : `border-zinc-800/90 ${theme.itemBorder}`
                  }`}
                >
                  <div>
                    <div className="relative w-full h-56 bg-zinc-950 overflow-hidden border-b border-zinc-800/80">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <ShoppingBag className="w-12 h-12" />
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/80 border border-zinc-700 text-zinc-200 backdrop-blur-md">
                          {item.category}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/80 border border-gothic-gold/40 text-gothic-gold backdrop-blur-md">
                          {item.condition}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        {item.available ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/90 border border-emerald-600/60 text-emerald-300 backdrop-blur-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Disponível
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900/90 border border-zinc-700 text-zinc-400 backdrop-blur-md">
                            <XCircle className="w-3 h-3" />
                            Indisponível
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-xl font-bold text-white group-hover:text-gothic-gold transition-colors leading-snug">
                          {item.title}
                        </h3>
                        {item.featured && (
                          <Sparkles className="w-4 h-4 text-gothic-gold shrink-0 mt-1" />
                        )}
                      </div>

                      <div className={`font-serif text-2xl font-black ${theme.accentText}`}>
                        {item.price}
                      </div>

                      {item.description && (
                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-3">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-2">
                      <a
                        href={item.contact_url || defaultContact}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${theme.button}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{store.item_contact_label || `Negociar com ${store.name}`}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeItem &&
        store &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="lycoris-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overscroll-contain"
            onClick={() => setActiveItem(null)}
          >
            <div
              className="lycoris-modal-panel relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-gothic-gold/40 shadow-2xl p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {activeItem.image_url && (
                <div className="w-full max-h-80 bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeItem.image_url}
                    alt={activeItem.title}
                    className="max-h-80 w-auto object-contain"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-200">
                    {activeItem.category}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 border border-gothic-gold/40 text-gothic-gold">
                    {activeItem.condition}
                  </span>
                  {activeItem.available ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 border border-emerald-600/60 text-emerald-300">
                      Disponível
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-700 text-zinc-400">
                      Indisponível
                    </span>
                  )}
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  {activeItem.title}
                </h2>

                <div className={`font-serif text-3xl font-black ${theme.accentText}`}>
                  {activeItem.price}
                </div>

                {activeItem.description && (
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line pt-2 border-t border-zinc-800">
                    {activeItem.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">
                  Catálogo informativo • A compra e o envio são combinados diretamente com {store.name}.
                </p>
                <a
                  href={activeItem.contact_url || defaultContact}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all shrink-0 ${theme.button}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{store.item_contact_label || `Entrar em Contato`}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}

      <Footer />
    </main>
  );
}
