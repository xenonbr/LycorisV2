"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, Image as ImageIcon, HeartHandshake, ShoppingBag, ExternalLink, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-gothic-bg/85 backdrop-blur-md border-b border-lycoris-900/30 shadow-lycoris-glow'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo / Flor de Lycoris */}
        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon.png"
            alt="Lycoris Garden Logo"
            className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(225,29,72,0.45)] group-hover:scale-110 transition-transform duration-300"
          />
          <div className="truncate">
            <span className="font-serif text-lg sm:text-2xl font-bold tracking-wider text-zinc-100 group-hover:text-white transition-colors">
              LYCORIS <span className="text-lycoris-500">GARDEN</span>
            </span>
            <span className="block text-[9px] sm:text-[10px] tracking-widest text-zinc-400 uppercase font-sans -mt-0.5">
              VRChat Community
            </span>
          </div>
        </Link>

        {/* Links Desktop */}
        <nav className="hidden md:flex items-center gap-7 font-sans text-sm font-medium text-zinc-300">
          <Link
            href="/#sobre"
            className="hover:text-lycoris-400 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-lycoris-500" />
            Sobre
          </Link>
          <Link
            href="/#eventos"
            className="hover:text-lycoris-400 transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-lycoris-500" />
            Eventos
          </Link>
          <Link
            href="/#galeria"
            className="hover:text-lycoris-400 transition-colors flex items-center gap-1.5"
          >
            <ImageIcon className="w-4 h-4 text-lycoris-500" />
            Galeria
          </Link>
          <Link
            href="/apoiadores"
            className="hover:text-lycoris-400 transition-colors flex items-center gap-1.5"
          >
            <HeartHandshake className="w-4 h-4 text-gothic-gold" />
            Parceiros
          </Link>
          <Link
            href="/sawvr"
            className="px-3 py-1 rounded-full bg-zinc-900/90 border border-gothic-gold/35 text-gothic-gold hover:bg-gothic-gold/15 hover:border-gothic-gold transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-gothic-gold" />
            Loja SawVR
          </Link>
        </nav>

        {/* Botão de Ação Direto (Filiação VRChat) */}
        <div className="hidden md:flex items-center">
          <a
            href="https://vrc.group/LYCORI.7672"
            target="_blank"
            rel="noopener noreferrer"
            className="relative group overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-lycoris-500"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-lycoris-600 via-lycoris-500 to-lycoris-800 rounded-full animate-pulseGlow" />
            <span className="relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-gothic-bg hover:bg-black/80 text-white text-sm font-semibold tracking-wide transition-all duration-300 group-hover:shadow-lycoris-glow">
              <span>Entrar no Grupo VRChat</span>
              <ExternalLink className="w-4 h-4 text-lycoris-400 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </a>
        </div>

        {/* Menu Mobile Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-zinc-300 hover:text-white p-2 rounded-lg bg-zinc-900/80 border border-zinc-800"
            aria-label="Abrir Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gothic-bg/98 border-b border-lycoris-900/40 backdrop-blur-xl px-5 py-5 space-y-1 shadow-2xl">
          <Link
            href="/#sobre"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 text-zinc-200 active:text-lycoris-400 font-medium py-3 px-3 rounded-xl active:bg-zinc-900/80"
          >
            <Sparkles className="w-4 h-4 text-lycoris-500" />
            <span>Sobre</span>
          </Link>
          <Link
            href="/#eventos"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 text-zinc-200 active:text-lycoris-400 font-medium py-3 px-3 rounded-xl active:bg-zinc-900/80"
          >
            <Calendar className="w-4 h-4 text-lycoris-500" />
            <span>Eventos</span>
          </Link>
          <Link
            href="/#galeria"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 text-zinc-200 active:text-lycoris-400 font-medium py-3 px-3 rounded-xl active:bg-zinc-900/80"
          >
            <ImageIcon className="w-4 h-4 text-lycoris-500" />
            <span>Galeria Comunitária</span>
          </Link>
          <Link
            href="/apoiadores"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 text-zinc-200 active:text-lycoris-400 font-medium py-3 px-3 rounded-xl active:bg-zinc-900/80"
          >
            <HeartHandshake className="w-4 h-4 text-gothic-gold" />
            <span>Parceiros &amp; Apoiadores</span>
          </Link>
          <Link
            href="/sawvr"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 text-gothic-gold font-semibold py-3 px-3 rounded-xl bg-zinc-900/60 border border-gothic-gold/30"
          >
            <ShoppingBag className="w-4 h-4 text-gothic-gold" />
            <span>Catálogo SawVR (VR &amp; Eletrônicos)</span>
          </Link>
          <div className="pt-3">
            <a
              href="https://vrc.group/LYCORI.7672"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-lycoris-600 active:bg-lycoris-700 text-white font-semibold shadow-lycoris-glow text-sm"
            >
              <span>Entrar no Grupo VRChat</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
