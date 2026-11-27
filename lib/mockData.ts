import { VRChatEvent, GalleryImage, Supporter, HeroStat, HomePageContent } from './types';

export const INITIAL_HERO_STATS: HeroStat[] = [
  { id: 'stat-1', value: '1.2K+', label: 'Membros Ativos', color: 'lycoris-400' },
  { id: 'stat-2', value: '80+', label: 'Encontros Noturnos', color: 'gothic-gold' },
  { id: 'stat-3', value: 'PC & Quest', label: 'Suporte Híbrido', color: 'white' },
  { id: 'stat-4', value: '100%', label: 'Atmosfera Gótica', color: 'lycoris-500' },
];

export const INITIAL_HOME_CONTENT: HomePageContent = {
  heroBadge: 'VRChat Community • Red Spider Lily',
  heroQuote: 'Lycoris‚ um jardim onde a vida e a morte se encontram.',
  heroBullets: [
    'Instâncias com DJs',
    'Sorteios',
    'Eventos e atividades especiais',
    'Uma comunidade para conhecer pessoas e criar memórias',
  ],
  heroInviteQuote: 'Entre no jardim, e se torne um Lírio.',
  heroCtaText: 'Filiação ao Grupo no VRChat',
  heroCtaUrl: 'https://vrc.group/LYCORI.7672',
  aboutBadge: 'Manifesto da Comunidade',
  aboutTitleStart: 'Um Jardim Carmesim Onde a',
  aboutTitleHighlight: 'Arte e a Conexão',
  aboutTitleEnd: 'Florescem',
  aboutDescription:
    'Inspirado na mística da flor Lycoris Radiata (Red Spider Lily), o Lycoris Garden nasceu como um santuário para usuários do VRChat que buscam escapar do ruído convencional. Valorizamos a calma noturna, o respeito mútuo e a celebração da beleza estética.',
  block1Title: 'ATMOSFERA',
  block1Description: 'Instâncias selecionadas, iluminação suave e trilhas sonoras imersivas.',
  block2Title: 'DIVERSÃO',
  block2Description: 'Mais do que flores, criamos ambientes vivos para relaxar e trocar experiências.',
  brandImageUrl: '/images/brand-guide.jpg',
  brandEyebrow: 'Lycoris Garden',
  brandTitle: 'Comunidade Oficial',
  brandSubtitle: 'Faça parte você tambem!',
};

export const INITIAL_SUPPORTERS: Supporter[] = [
  {
    name: "LupratuVR",
    url: "https://www.lupratu.com.br",
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
