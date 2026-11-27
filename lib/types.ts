export interface VRChatEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  vrchat_world: string;
  world_url?: string;
  image_url?: string;
  category?: string;
  is_external?: boolean;
  external_platform?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommentItem {
  id: string;
  image_id: string;
  author_name: string;
  content: string;
  created_at: string;
  ip_tag?: string;
  ip_blocked?: boolean;
}

export interface CommentIdentityBinding {
  ipHash: string;
  ipTag: string;
  authorName: string;
  normalizedName: string;
  updatedAt: string;
  blocked?: boolean;
}

export interface GalleryImage {
  id: string;
  title: string;
  url: string;
  author: string;
  vrchat_world?: string;
  likes: number;
  created_at: string;
  comments?: CommentItem[];
  hidden?: boolean;
  sort_order?: number;
}

export interface Supporter {
  id?: string;
  name: string;
  url: string;
  tagline: string;
  role: string;
  avatar?: string | null;
  banner_url?: string | null;
  sort_order?: number;
  is_owner?: boolean;
  is_gold_crystal?: boolean;
  crystal_style?: 'none' | 'crimson' | 'gold';
}

export interface EventRegistration {
  id: string;
  event_id: string;
  name: string;
  username: string;
  notes?: string | null;
  created_at: string;
}

export interface HeroStat {
  id?: string;
  value: string;
  label: string;
  color?: 'lycoris-400' | 'gothic-gold' | 'white' | 'lycoris-500';
}

export interface HomePageContent {
  // Banner Principal (Hero)
  heroBadge: string;
  heroQuote: string;
  heroBullets: string[];
  heroInviteQuote: string;
  heroCtaText: string;
  heroCtaUrl: string;
  // Seção Sobre / Manifesto da Comunidade
  aboutBadge: string;
  aboutTitleStart: string;
  aboutTitleHighlight: string;
  aboutTitleEnd: string;
  aboutDescription: string;
  block1Title: string;
  block1Description: string;
  block2Title: string;
  block2Description: string;
  brandImageUrl: string;
  brandEyebrow: string;
  brandTitle: string;
  brandSubtitle: string;
}

export interface SawCatalogItem {
  id: string;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  image_url: string;
  contact_url: string;
  available: boolean;
  featured?: boolean;
  created_at: string;
}

export interface PendingGalleryPost {
  id: string;
  title: string;
  url: string;
  storage_path?: string;
  author: string;
  vrchat_world: string;
  created_at: string;
}

export type AdminModuleKey =
  | 'events'
  | 'gallery'
  | 'registrations'
  | 'supporters'
  | 'stats'
  | 'homepage'
  | 'sawvr'
  | 'submissions'
  | 'comments'
  | 'users';

export interface AdminAccount {
  id: string;
  label: string;
  password: string;
  modules: Record<AdminModuleKey, boolean>;
  created_at: string;
}

// Config de acesso: apenas a senha mestra + contas individuais, cada uma com seus próprios módulos liberados
export interface AdminAccessConfig {
  level2Password: string;
  accounts: AdminAccount[];
}
