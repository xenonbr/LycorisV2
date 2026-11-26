"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SawCatalogItem } from '@/lib/types';
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

const SAW_DEFAULT_CONTACT = 'https://discord.gg/V5ykbQsBAE';
const SAW_AVATAR_URL =
  'https://ryeiymuisgdqglkvxgbs.supabase.co/storage/v1/object/public/lycoris-media/supporters/1795626019406-e6468f2a.webp';

export default function SawVRPage() {
  const [items, setItems] = useState<SawCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeItem, setActiveItem] = useState<SawCatalogItem | null>(null);

  useEffect(() => {
    fetch('/api/sawvr', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-gothic-bg text-zinc-100">
      <Navbar />

      {/* Banner / Cabeçalho do Parceiro SawVR */}
      <section
        style={{ '--reveal-delay': '240ms' } as React.CSSProperties}
        className="lycoris-reveal-step relative pt-28 sm:pt-36 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10"
      >
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-lycoris-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Lycoris Garden</span>
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900/95 to-zinc-950 border border-gothic-gold/40 p-6 sm:p-12 shadow-[0_0_35px_-8px_rgba(218,175,55,0.3)] backdrop-blur-md">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-gothic-gold/10 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 bg-lycoris-600/10 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gothic-gold/70 to-transparent" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-gothic-gold/40 text-gothic-gold text-xs font-semibold uppercase tracking-widest">
                <Cpu className="w-3.5 h-3.5" />
                Parceiro Oficial • Catálogo VR &amp; Eletrônicos
              </div>

              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SAW_AVATAR_URL}
                  alt="SawVR Logo"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-gothic-gold/50 shadow-gold-glow shrink-0"
                />
                <div>
                  <h1 className="font-serif text-3xl sm:text-5xl font-black text-white tracking-tight">
                    SAW<span className="text-gothic-gold">VR</span> STORE
                  </h1>
                  <p className="text-xs sm:text-sm text-gothic-gold/90 font-medium">
                    Equipamentos de Realidade Virtual, Full Body Tracking, Acessórios &amp; Hardware
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Bem-vindo ao catálogo oficial do nosso parceiro <strong>SawVR</strong>. Confira abaixo os equipamentos disponíveis à pronta entrega ou sob encomenda. Para negociar, tirar dúvidas ou finalizar a compra, basta clicar em <strong>Entrar em Contato com SawVR</strong> no anúncio desejado.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Parceiro Verificado pela Comunidade
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-gothic-gold" />
                  Atendimento e Negociação Direta
                </span>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <a
                href={SAW_DEFAULT_CONTACT}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gothic-gold hover:bg-amber-400 text-black font-bold text-sm shadow-gold-glow transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Falar com SawVR no Discord</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Filtros e Busca do Catálogo */}
      <section className="relative pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 flex-1 space-y-8">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Abas de Categoria */}
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

          {/* Barra de Busca */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar headset, tracker, acessório..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-white text-base sm:text-xs placeholder-zinc-500 focus:outline-none focus:border-gothic-gold"
            />
          </div>
        </div>

        {/* Grade de Produtos */}
        {loading ? (
          <div className="text-center py-20 text-xs text-zinc-500 animate-pulse">
            Carregando catálogo de equipamentos do SawVR...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 px-6 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 max-w-lg mx-auto backdrop-blur-sm space-y-3">
            <ShoppingBag className="w-10 h-10 text-gothic-gold/60 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-white">
              {items.length === 0
                ? 'Nenhum anúncio publicado no catálogo ainda'
                : 'Nenhum item encontrado para esse filtro'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {items.length === 0
                ? 'Novos equipamentos de VR e eletrônicos serão adicionados em breve. Você também pode consultar disponibilidade diretamente no Discord do SawVR!'
                : 'Tente buscar por outro termo ou selecione a categoria "Todos".'}
            </p>
            <div className="pt-2">
              <a
                href={SAW_DEFAULT_CONTACT}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-gothic-gold/40 text-gothic-gold text-xs font-semibold transition-colors"
              >
                <span>Consultar Estoque no Discord</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
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
                    : 'border-zinc-800/90 hover:border-gothic-gold/50 hover:shadow-gold-glow'
                }`}
              >
                <div>
                  {/* Foto do Produto */}
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

                    {/* Badges no topo da imagem */}
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

                  {/* Corpo do Card */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-xl font-bold text-white group-hover:text-gothic-gold transition-colors leading-snug">
                        {item.title}
                      </h3>
                      {item.featured && (
                        <Sparkles className="w-4 h-4 text-gothic-gold shrink-0 mt-1" />
                      )}
                    </div>

                    <div className="font-serif text-2xl font-black text-gothic-gold gold-glow">
                      {item.price}
                    </div>

                    {item.description && (
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rodapé de Contato */}
                <div className="p-5 pt-0">
                  <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-2">
                    <a
                      href={item.contact_url || SAW_DEFAULT_CONTACT}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gothic-gold hover:bg-amber-400 text-black font-bold text-xs shadow-sm transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Negociar com SawVR</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal de Detalhes do Produto */}
      {activeItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-gothic-gold/40 shadow-2xl p-6 space-y-5"
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

              <div className="font-serif text-3xl font-black text-gothic-gold gold-glow">
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
                Catálogo informativo • A compra e o envio são combinados diretamente com o SawVR.
              </p>
              <a
                href={activeItem.contact_url || SAW_DEFAULT_CONTACT}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gothic-gold hover:bg-amber-400 text-black font-bold text-xs shadow-gold-glow transition-all shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Entrar em Contato para Comprar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
