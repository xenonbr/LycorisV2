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
  created_at?: string;
  updated_at?: string;
}

export interface CommentItem {
  id: string;
  image_id: string;
  author_name: string;
  content: string;
  created_at: string;
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
