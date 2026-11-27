import {
  VRChatEvent,
  GalleryImage,
  Supporter,
  HeroStat,
  HomePageContent,
  PartnerStore,
} from './types';

export const INITIAL_PARTNER_STORES: PartnerStore[] = [
  {
    id: 'sawvr',
    slug: 'sawvr',
    name: 'SAWVR STORE',
    badge: 'Parceiro Oficial • Catálogo VR & Eletrônicos',
    tagline: 'Equipamentos de Realidade Virtual, Full Body Tracking, Acessórios & Hardware',
    description:
      'Bem-vindo ao catálogo oficial do nosso parceiro SawVR. Confira abaixo os equipamentos disponíveis à pronta entrega ou sob encomenda. Para negociar, tirar dúvidas ou finalizar a compra, basta clicar em Entrar em Contato com SawVR no anúncio desejado.',
    logo_url:
      'https://ryeiymuisgdqglkvxgbs.supabase.co/storage/v1/object/public/lycoris-media/supporters/1795626019406-e6468f2a.webp',
    banner_url: '',
    contact_url: 'https://discord.gg/V5ykbQsBAE',
    contact_label: 'Falar com SawVR no Discord',
    item_contact_label: 'Negociar com SawVR',
    crystal_style: 'gold',
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

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
