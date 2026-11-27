import React from 'react';
import {
  Crown,
  Sparkles,
  Flame,
  Heart,
  Gem,
  Palette,
  Video,
  Music,
  Shield,
  ShoppingBag,
  Users,
  Ban,
} from 'lucide-react';
import { Supporter, SupporterBadgeIcon, SupporterCrystalStyle } from './types';

export const SUPPORTER_BADGE_ICONS: {
  key: SupporterBadgeIcon;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'none', label: 'Sem Ícone', Icon: Ban },
  { key: 'crown', label: 'Coroa', Icon: Crown },
  { key: 'sparkles', label: 'Brilho', Icon: Sparkles },
  { key: 'flame', label: 'Chama', Icon: Flame },
  { key: 'gem', label: 'Cristal', Icon: Gem },
  { key: 'heart', label: 'Coração', Icon: Heart },
  { key: 'palette', label: 'Artista', Icon: Palette },
  { key: 'video', label: 'Live / VTuber', Icon: Video },
  { key: 'music', label: 'Música / DJ', Icon: Music },
  { key: 'shopping', label: 'Loja VR', Icon: ShoppingBag },
  { key: 'users', label: 'Comunidade', Icon: Users },
  { key: 'shield', label: 'Guardião', Icon: Shield },
];

export function resolveSupporterStyle(supporter: Supporter): SupporterCrystalStyle {
  if (supporter.crystal_style && supporter.crystal_style !== 'none') {
    return supporter.crystal_style;
  }
  if (supporter.is_owner) return 'crimson';
  if (supporter.is_gold_crystal) return 'gold';
  const order = supporter.sort_order ?? 0;
  if (order === -2 || order <= -6) return 'crimson';
  if (order === -1) return 'gold';
  if (order === -3) return 'purple';
  if (order === -4) return 'blue';
  if (order === -5) return 'pink';
  return 'none';
}

export function resolveSupporterBadgeIcon(supporter: Supporter): SupporterBadgeIcon {
  if (supporter.badge_icon) return supporter.badge_icon;
  return 'none';
}

export function renderSupporterBadgeIcon(
  iconKey: SupporterBadgeIcon | undefined,
  className = 'w-3.5 h-3.5'
): React.ReactNode {
  if (!iconKey || iconKey === 'none') return null;
  const entry = SUPPORTER_BADGE_ICONS.find((i) => i.key === iconKey);
  if (!entry) return null;
  const IconComp = entry.Icon;
  return <IconComp className={className} />;
}
