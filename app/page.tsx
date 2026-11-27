import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import AboutSection from '@/components/AboutSection';
import EventsSection from '@/components/EventsSection';
import GallerySection from '@/components/GallerySection';
import SupportersSection from '@/components/SupportersSection';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-gothic-bg">
      {/* Barra de Navegação Superior */}
      <Navbar />

      {/* Banner Cinematográfico (Hero) */}
      <Hero />

      {/* Seção Sobre / Filosofia da Marca (Editável no Admin -> Página Inicial) */}
      <AboutSection />

      {/* Seção de Eventos Dinâmicos */}
      <EventsSection />

      {/* Seção da Galeria com Lightbox e Comentários */}
      <GallerySection />

      {/* Seção de Apoiadores (LupratuVR & Ph4nt0m) */}
      <SupportersSection />

      {/* Rodapé Oficial */}
      <Footer />
    </main>
  );
}
