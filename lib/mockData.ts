import { VRChatEvent, GalleryImage, Supporter, HeroStat } from './types';

export const INITIAL_HERO_STATS: HeroStat[] = [
  { id: 'stat-1', value: '1.2K+', label: 'Membros Ativos', color: 'lycoris-400' },
  { id: 'stat-2', value: '80+', label: 'Encontros Noturnos', color: 'gothic-gold' },
  { id: 'stat-3', value: 'PC & Quest', label: 'Suporte Híbrido', color: 'white' },
  { id: 'stat-4', value: '100%', label: 'Atmosfera Gótica', color: 'lycoris-500' },
];

export const INITIAL_SUPPORTERS: Supporter[] = [
  {
    name: "LupratuVR",
    url: "https://lupratuvr.vercel.app/",
    tagline: "Vtuber & Streamer.",
    role: "Parceira Criativa",
  },
  {
    name: "Ph4nt0m",
    url: "https://ph4nt0m.carrd.co/",
    tagline: "Direção de arte, avatar maker.",
    role: "Apoiador Místico",
  },
];

export const INITIAL_EVENTS: VRChatEvent[] = [];

export const INITIAL_GALLERY: GalleryImage[] = [];
