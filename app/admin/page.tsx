"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Calendar,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  Sparkles,
  Radio,
  Users,
  HeartHandshake,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  ShoppingBag,
  Clock,
  Check,
  X,
  KeyRound,
  UserCheck,
  Edit3,
  Search,
} from 'lucide-react';
import {
  VRChatEvent,
  GalleryImage,
  CommentItem,
  Supporter,
  EventRegistration,
  HeroStat,
  SawCatalogItem,
  PendingGalleryPost,
  AdminModuleKey,
  ExtraAdminPassword,
  AdminAccessConfig,
  CommentIdentityBinding,
} from '@/lib/types';
import { INITIAL_EVENTS, INITIAL_GALLERY, INITIAL_HERO_STATS } from '@/lib/mockData';

const TOKEN_KEY = 'lycoris_admin_token';
const MASTER_TOKEN_KEY = 'lycoris_master_admin_token';

// fetch autenticado com o token de administrador (+ token do adm principal quando desbloqueado)
function api(url: string, init: RequestInit = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY) || '';
  const masterToken = sessionStorage.getItem(MASTER_TOKEN_KEY) || '';
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
    Authorization: `Bearer ${token}`,
  };
  if (masterToken) {
    headers['x-master-token'] = masterToken;
  }
  return fetch(url, {
    ...init,
    headers,
  });
}

const EMPTY_SUPPORTER = {
  name: '',
  url: '',
  tagline: '',
  role: 'Apoiador',
  avatar: '',
  banner_url: '',
  is_owner: false,
  is_gold_crystal: false,
};
const EMPTY_EVENT = {
  title: '',
  description: '',
  date: '',
  time: '21:30',
  vrchat_world: '',
  world_url: '',
  image_url: '',
  category: 'Encontro Oficial',
  is_external: false,
  external_platform: 'TikTok Live',
};

function extractHHMM(rawTime?: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(String(rawTime || '').trim());
  return match ? `${match[1]}:${match[2]}` : '21:30';
}

function isValidCalendarDate(dateStr?: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || '').trim());
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 2024 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const EMPTY_SAW_ITEM = {
  title: '',
  description: '',
  price: '',
  category: 'Headset VR',
  condition: 'Novo / Lacrado',
  image_url: '',
  contact_url: 'https://discord.gg/V5ykbQsBAE',
  available: true,
  featured: false,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Comprime imagem no navegador para WebP (max 1920px, qualidade 82%) antes de subir
async function compressImageFile(file: File, maxDim = 1920, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas não suportado'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Falha ao comprimir imagem'));
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
          resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
        },
        'image/webp',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Arquivo de imagem inválido'));
    };
    img.src = objectUrl;
  });
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [masterAuthError, setMasterAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<
    | 'events'
    | 'registrations'
    | 'supporters'
    | 'gallery'
    | 'comments'
    | 'stats'
    | 'sawvr'
    | 'submissions'
    | 'users'
    | 'access'
  >('events');

  // Permissões de Módulos e Senhas (gerenciadas pelo Admin Nível 2)
  const [level1Modules, setLevel1Modules] = useState<Record<AdminModuleKey, boolean>>({
    events: true,
    gallery: true,
    registrations: true,
    supporters: false,
    stats: false,
    sawvr: false,
    submissions: false,
    comments: false,
    users: false,
  });
  const [level1PasswordEdit, setLevel1PasswordEdit] = useState('lyly2026');
  const [level2PasswordEdit, setLevel2PasswordEdit] = useState('ra028899');
  const [extraPasswords, setExtraPasswords] = useState<ExtraAdminPassword[]>([]);
  const [newExtraPassForm, setNewExtraPassForm] = useState({
    label: '',
    password: '',
    level: 1 as 1 | 2,
  });
  const [savingAccess, setSavingAccess] = useState(false);

  const canAccess = (mod: AdminModuleKey) =>
    isMasterUnlocked || Boolean(level1Modules[mod]);

  // Estados de dados
  const [events, setEvents] = useState<VRChatEvent[]>(INITIAL_EVENTS);
  const [gallery, setGallery] = useState<GalleryImage[]>(INITIAL_GALLERY);
  const [pendingPosts, setPendingPosts] = useState<PendingGalleryPost[]>([]);
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);
  const [allComments, setAllComments] = useState<CommentItem[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [heroStats, setHeroStats] = useState<HeroStat[]>(INITIAL_HERO_STATS);
  const [sawCatalog, setSawCatalog] = useState<SawCatalogItem[]>([]);
  const [sawForm, setSawForm] = useState(EMPTY_SAW_ITEM);
  const [editingSawId, setEditingSawId] = useState<string | null>(null);
  const [uploadingSawImage, setUploadingSawImage] = useState(false);
  const [sawCompressionStats, setSawCompressionStats] = useState<string | null>(null);
  const [savingStats, setSavingStats] = useState(false);
  const [customBlockedWords, setCustomBlockedWords] = useState<string[]>([]);
  const [commentIdentities, setCommentIdentities] = useState<CommentIdentityBinding[]>([]);
  const [editingIdentityIpTag, setEditingIdentityIpTag] = useState<string | null>(null);
  const [editingIdentityName, setEditingIdentityName] = useState('');
  const [identitySearch, setIdentitySearch] = useState('');
  const [newBlockedWord, setNewBlockedWord] = useState('');
  const [savingBlockedWords, setSavingBlockedWords] = useState(false);
  const [regFilter, setRegFilter] = useState('');
  const [supporterForm, setSupporterForm] = useState(EMPTY_SUPPORTER);
  const [editingSupporterId, setEditingSupporterId] = useState<string | null>(null);
  const [draggedGalleryId, setDraggedGalleryId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Formulário de Novo / Edição de Evento
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const [eventCompressionStats, setEventCompressionStats] = useState<string | null>(null);

  // Formulário de Nova Foto na Galeria
  const [galleryForm, setGalleryForm] = useState({
    title: '',
    url: '',
    author: '',
    vrchat_world: 'Lycoris Garden Sanctuary',
  });

  // Teste de Webhook / Feed Automático
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  // Estados de Upload e Compressão de Imagem do PC
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingSupporterBanner, setUploadingSupporterBanner] = useState(false);
  const [supporterBannerStats, setSupporterBannerStats] = useState<string | null>(null);

  const handleEventImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEventImage(true);
    setEventCompressionStats('Comprimindo imagem do mapa...');
    try {
      const originalSize = file.size;
      const compressed = await compressImageFile(file, 1280, 0.8);
      const savedPct = Math.max(0, Math.round((1 - compressed.size / originalSize) * 100));

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('folder', 'events');

      const res = await api('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');

      setEventForm((prev) => ({ ...prev, image_url: data.url }));
      setEventCompressionStats(
        `Comprimido: ${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (WebP, -${savedPct}%)`
      );
      showToast('Fundo do evento comprimido e enviado!');
    } catch (err: any) {
      setEventCompressionStats(null);
      showToast(err.message || 'Erro ao enviar imagem do mapa');
    } finally {
      setUploadingEventImage(false);
      e.target.value = '';
    }
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setCompressionStats('Comprimindo e otimizando imagem...');
    try {
      const originalSize = file.size;
      const compressed = await compressImageFile(file, 1920, 0.82);
      const savedPct = Math.max(0, Math.round((1 - compressed.size / originalSize) * 100));

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('folder', 'gallery');

      const res = await api('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');

      setGalleryForm((prev) => ({
        ...prev,
        url: data.url,
        title: prev.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }));
      setCompressionStats(
        `Comprimido: ${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (WebP, -${savedPct}% de espaço)`
      );
      showToast('Imagem comprimida e enviada!');
    } catch (err: any) {
      setCompressionStats(null);
      showToast(err.message || 'Erro ao enviar arquivo');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSupporterAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const compressed = await compressImageFile(file, 512, 0.85);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('folder', 'supporters');
      const res = await api('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');
      setSupporterForm((prev) => ({ ...prev, avatar: data.url }));
      showToast('Logo comprimida e enviada!');
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar logo');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSupporterBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSupporterBanner(true);
    setSupporterBannerStats('Comprimindo imagem de fundo...');
    try {
      const originalSize = file.size;
      const compressed = await compressImageFile(file, 1280, 0.8);
      const savedPct = Math.max(0, Math.round((1 - compressed.size / originalSize) * 100));

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('folder', 'supporters');
      const res = await api('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');

      setSupporterForm((prev) => ({ ...prev, banner_url: data.url }));
      setSupporterBannerStats(
        `Comprimido: ${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (WebP, -${savedPct}%)`
      );
      showToast('Plano de fundo do apoiador comprimido e enviado!');
    } catch (err: any) {
      setSupporterBannerStats(null);
      showToast(err.message || 'Erro ao enviar plano de fundo');
    } finally {
      setUploadingSupporterBanner(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem(TOKEN_KEY)) {
      setIsAuthenticated(true);
      if (sessionStorage.getItem(MASTER_TOKEN_KEY)) {
        setIsMasterUnlocked(true);
      }
      fetchDashboardData();
    }
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      if (res.ok) {
        const { token, masterToken } = await res.json();
        sessionStorage.setItem(TOKEN_KEY, token);
        if (masterToken) {
          sessionStorage.setItem(MASTER_TOKEN_KEY, masterToken);
          setIsMasterUnlocked(true);
        }
        setIsAuthenticated(true);
        fetchDashboardData();
      } else {
        setAuthError('Senha incorreta.');
      }
    } catch (err) {
      setAuthError('Erro ao comunicar com o servidor');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(MASTER_TOKEN_KEY);
    setIsAuthenticated(false);
    setIsMasterUnlocked(false);
    setPasswordInput('');
    setMasterPasswordInput('');
  };

  const handleMasterUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterAuthError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPasswordInput, mode: 'master' }),
      });
      if (res.ok) {
        const { masterToken } = await res.json();
        sessionStorage.setItem(MASTER_TOKEN_KEY, masterToken);
        setIsMasterUnlocked(true);
        setMasterPasswordInput('');
        showToast('Acesso de Administrador Principal desbloqueado!');
      } else {
        setMasterAuthError('Senha do Administrador Principal incorreta.');
      }
    } catch {
      setMasterAuthError('Erro ao verificar senha.');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [resEv, resGal, resComm, resReg, resSup, resStats, resMod, resSaw, resSub, resAcc] =
        await Promise.all([
          api('/api/events'),
          api('/api/gallery?includeHidden=true'),
          api('/api/comments'),
          api('/api/registrations'),
          api('/api/supporters'),
          api('/api/stats'),
          api('/api/moderation'),
          api('/api/sawvr'),
          api('/api/gallery/submissions'),
          api('/api/access'),
        ]);

      if (resReg.status === 401) {
        handleLogout(); // token expirado
        return;
      }
      if (resReg.ok) setRegistrations(await resReg.json());
      if (resSup.ok) setSupporters(await resSup.json());
      if (resStats.ok) {
        const s = await resStats.json();
        if (Array.isArray(s) && s.length > 0) setHeroStats(s);
      }
      if (resMod.ok) {
        const m = await resMod.json();
        if (Array.isArray(m.words)) setCustomBlockedWords(m.words);
        if (Array.isArray(m.identities)) setCommentIdentities(m.identities);
      }
      if (resSaw.ok) {
        const saw = await resSaw.json();
        if (Array.isArray(saw)) setSawCatalog(saw);
      }
      if (resSub.ok) {
        const sub = await resSub.json();
        if (Array.isArray(sub)) setPendingPosts(sub);
      }
      if (resAcc.ok) {
        const acc: Partial<AdminAccessConfig> = await resAcc.json();
        if (acc.level1Modules) {
          const nextMods = { ...level1Modules, ...acc.level1Modules };
          setLevel1Modules(nextMods);
          if (!isMasterUnlocked && !sessionStorage.getItem(MASTER_TOKEN_KEY)) {
            const firstAvailable = (
              [
                'events',
                'gallery',
                'registrations',
                'supporters',
                'stats',
                'sawvr',
                'submissions',
                'comments',
              ] as AdminModuleKey[]
            ).find((k) => Boolean(nextMods[k]));
            if (firstAvailable && !nextMods[activeTab as AdminModuleKey]) {
              setActiveTab(firstAvailable);
            }
          }
        }
        if (acc.level1Password) setLevel1PasswordEdit(acc.level1Password);
        if (acc.level2Password) setLevel2PasswordEdit(acc.level2Password);
        if (Array.isArray(acc.extraPasswords)) setExtraPasswords(acc.extraPasswords);
      }
      if (resEv.ok) setEvents(await resEv.json());
      if (resGal.ok) setGallery(await resGal.json());
      if (resComm.ok) setAllComments(await resComm.json());
    } catch (err) {
      console.warn('Erro ao atualizar dados do painel:', err);
    }
  };

  // Salvar configurações de Acessos & Senhas (Admin Nível 2)
  const saveAccessSettings = async (
    nextConfig: Partial<AdminAccessConfig>,
    toastMessage = 'Configurações de acesso atualizadas!'
  ) => {
    setSavingAccess(true);
    try {
      const payload = {
        level1Password: nextConfig.level1Password ?? level1PasswordEdit,
        level2Password: nextConfig.level2Password ?? level2PasswordEdit,
        extraPasswords: nextConfig.extraPasswords ?? extraPasswords,
        level1Modules: nextConfig.level1Modules ?? level1Modules,
      };
      const res = await api('/api/access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.level1Modules) setLevel1Modules(data.level1Modules);
        if (data.level1Password) setLevel1PasswordEdit(data.level1Password);
        if (data.level2Password) setLevel2PasswordEdit(data.level2Password);
        if (Array.isArray(data.extraPasswords)) setExtraPasswords(data.extraPasswords);
        showToast(toastMessage);
      } else {
        showToast(data.error || 'Erro ao salvar configurações de acesso');
      }
    } catch {
      showToast('Erro de conexão ao salvar acessos');
    } finally {
      setSavingAccess(false);
    }
  };

  const handleToggleLevel1Module = async (modKey: AdminModuleKey) => {
    const updated = {
      ...level1Modules,
      [modKey]: !level1Modules[modKey],
    };
    setLevel1Modules(updated);
    await saveAccessSettings(
      { level1Modules: updated },
      updated[modKey]
        ? 'Módulo liberado para o Admin Nível 1!'
        : 'Módulo ocultado do Admin Nível 1!'
    );
  };

  const handleSaveMainPasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (level1PasswordEdit.trim().length < 3 || level2PasswordEdit.trim().length < 3) {
      showToast('As senhas devem ter pelo menos 3 caracteres.');
      return;
    }
    await saveAccessSettings(
      {
        level1Password: level1PasswordEdit.trim(),
        level2Password: level2PasswordEdit.trim(),
      },
      'Senhas principais atualizadas com sucesso!'
    );
  };

  const handleAddExtraPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newExtraPassForm.label.trim();
    const password = newExtraPassForm.password.trim();
    if (!label || password.length < 3) {
      showToast('Preencha uma identificação e uma senha com pelo menos 3 caracteres.');
      return;
    }
    const newEntry: ExtraAdminPassword = {
      id: crypto.randomUUID(),
      label,
      password,
      level: newExtraPassForm.level,
      created_at: new Date().toISOString(),
    };
    const nextList = [newEntry, ...extraPasswords];
    setExtraPasswords(nextList);
    setNewExtraPassForm({ label: '', password: '', level: 1 });
    await saveAccessSettings(
      { extraPasswords: nextList },
      `Nova senha cadastrada para ${label}!`
    );
  };

  const handleDeleteExtraPassword = async (id: string) => {
    if (!confirm('Deseja revogar e excluir esta senha de acesso?')) return;
    const nextList = extraPasswords.filter((p) => p.id !== id);
    setExtraPasswords(nextList);
    await saveAccessSettings({ extraPasswords: nextList }, 'Senha extra removida.');
  };

  // Gerenciar vínculos de Nick por IP e bloqueio de IP nos comentários
  const handleToggleBlockIp = async (ipTag: string) => {
    try {
      const res = await api('/api/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_block_ip', ipTag }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (Array.isArray(data.identities)) setCommentIdentities(data.identities);
        fetchDashboardData();
        showToast(`Status do IP ${ipTag} atualizado!`);
      } else {
        showToast(data.error || 'Erro ao alterar bloqueio do IP');
      }
    } catch {
      showToast('Erro de conexão ao bloquear/desbloquear IP');
    }
  };

  const handleReleaseNickIp = async (ipTag: string, nick: string) => {
    if (!confirm(`Liberar o vínculo entre o IP ${ipTag} e o nick "${nick}"?`)) return;
    try {
      const res = await api('/api/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release_nick', ipTag }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (Array.isArray(data.identities)) setCommentIdentities(data.identities);
        fetchDashboardData();
        showToast(`Vínculo de "${nick}" (${ipTag}) liberado!`);
      } else {
        showToast(data.error || 'Erro ao liberar vínculo');
      }
    } catch {
      showToast('Erro de conexão ao liberar vínculo');
    }
  };

  const handleSaveEditNickIp = async (ipTag: string) => {
    const clean = editingIdentityName.trim();
    if (clean.length < 2) {
      showToast('Digite um nome válido com pelo menos 2 caracteres.');
      return;
    }
    try {
      const res = await api('/api/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_nick',
          ipTag,
          newAuthorName: clean,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (Array.isArray(data.identities)) setCommentIdentities(data.identities);
        setEditingIdentityIpTag(null);
        setEditingIdentityName('');
        fetchDashboardData();
        showToast(`Nome do IP ${ipTag} atualizado para "${clean}"!`);
      } else {
        showToast(data.error || 'Erro ao editar nome vinculado');
      }
    } catch {
      showToast('Erro de conexão ao salvar edição do nome');
    }
  };

  // Aprovar ou Recusar Post da Comunidade (Nível 2 de Administração)
  const handleApproveCommunityPost = async (id: string) => {
    setProcessingPostId(id);
    try {
      const res = await api('/api/gallery/submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPendingPosts((prev) => prev.filter((p) => p.id !== id));
        fetchDashboardData();
        showToast('Post da comunidade aprovado e publicado na Galeria!');
      } else {
        showToast(data.error || 'Erro ao aprovar postagem');
      }
    } catch {
      showToast('Erro de conexão ao aprovar postagem');
    } finally {
      setProcessingPostId(null);
    }
  };

  const handleRejectCommunityPost = async (id: string) => {
    if (!confirm('Deseja recusar e apagar este envio da comunidade?')) return;
    setProcessingPostId(id);
    try {
      const res = await api('/api/gallery/submissions?id=' + encodeURIComponent(id), {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPendingPosts((prev) => prev.filter((p) => p.id !== id));
        showToast('Envio recusado e removido.');
      } else {
        showToast(data.error || 'Erro ao recusar postagem');
      }
    } catch {
      showToast('Erro de conexão ao recusar postagem');
    } finally {
      setProcessingPostId(null);
    }
  };

  // Catálogo SawVR (Nível 2 de Administração)
  const handleSawImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSawImage(true);
    setSawCompressionStats('Comprimindo foto do produto...');
    try {
      const originalSize = file.size;
      const compressed = await compressImageFile(file, 1280, 0.82);
      const savedPct = Math.max(0, Math.round((1 - compressed.size / originalSize) * 100));

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('folder', 'sawvr');

      const res = await api('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');

      setSawForm((prev) => ({ ...prev, image_url: data.url }));
      setSawCompressionStats(
        `Comprimido: ${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (WebP, -${savedPct}%)`
      );
      showToast('Foto do produto comprimida e enviada!');
    } catch (err: any) {
      setSawCompressionStats(null);
      showToast(err.message || 'Erro ao enviar foto do produto');
    } finally {
      setUploadingSawImage(false);
      e.target.value = '';
    }
  };

  const handleSaveSawItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const editing = editingSawId;
    try {
      const res = await api('/api/sawvr', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...sawForm, id: editing } : sawForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Erro ao salvar anúncio');
        return;
      }
      setSawForm(EMPTY_SAW_ITEM);
      setEditingSawId(null);
      setSawCompressionStats(null);
      await fetchDashboardData();
      showToast(editing ? 'Anúncio atualizado no catálogo!' : 'Anúncio publicado no catálogo SawVR!');
    } catch {
      showToast('Erro ao salvar anúncio');
    }
  };

  const handleEditSawItem = (item: SawCatalogItem) => {
    setEditingSawId(item.id);
    setSawCompressionStats(null);
    setSawForm({
      title: item.title,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Headset VR',
      condition: item.condition || 'Novo / Lacrado',
      image_url: item.image_url || '',
      contact_url: item.contact_url || 'https://discord.gg/V5ykbQsBAE',
      available: item.available !== false,
      featured: Boolean(item.featured),
    });
  };

  const handleToggleSawAvailable = async (item: SawCatalogItem) => {
    try {
      const res = await api('/api/sawvr', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, available: !item.available }),
      });
      if (res.ok) {
        setSawCatalog((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, available: !item.available } : i))
        );
        showToast(!item.available ? 'Item marcado como Disponível' : 'Item marcado como Indisponível');
      }
    } catch {
      showToast('Erro ao atualizar status');
    }
  };

  const handleDeleteSawItem = async (id: string) => {
    if (!confirm('Remover este anúncio do catálogo SawVR?')) return;
    const res = await api('/api/sawvr?id=' + id, { method: 'DELETE' });
    if (res.ok) {
      setSawCatalog((prev) => prev.filter((i) => i.id !== id));
      showToast('Anúncio removido');
    } else {
      showToast('Erro ao remover anúncio');
    }
  };

  // Filtro de palavras bloqueadas nos comentários
  const saveBlockedWordsList = async (nextWords: string[]) => {
    setSavingBlockedWords(true);
    try {
      const res = await api('/api/moderation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: nextWords }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.words)) {
        setCustomBlockedWords(data.words);
        showToast('Filtro de palavras atualizado!');
      } else {
        showToast(data.error || 'Erro ao atualizar filtro');
      }
    } catch {
      showToast('Erro ao atualizar filtro');
    } finally {
      setSavingBlockedWords(false);
    }
  };

  const handleAddBlockedWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = newBlockedWord.trim().toLowerCase();
    if (!w || w.length < 2) return;
    setNewBlockedWord('');
    if (customBlockedWords.includes(w)) return;
    await saveBlockedWordsList([...customBlockedWords, w]);
  };

  const handleRemoveBlockedWord = async (word: string) => {
    await saveBlockedWordsList(customBlockedWords.filter((w) => w !== word));
  };

  // Destaques do Topo (Hero Stats)
  const handleStatChange = (index: number, field: keyof HeroStat, val: string) => {
    setHeroStats((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveHeroStats = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStats(true);
    try {
      const res = await api('/api/stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroStats),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Erro ao salvar caixas de destaque');
        return;
      }
      if (Array.isArray(data)) setHeroStats(data);
      showToast('Caixas de destaque atualizadas no site!');
    } catch {
      showToast('Erro ao salvar caixas de destaque');
    } finally {
      setSavingStats(false);
    }
  };

  // Apoiadores
  const handleSaveSupporter = async (e: React.FormEvent) => {
    e.preventDefault();
    const editing = editingSupporterId;
    try {
      const res = await api('/api/supporters', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...supporterForm, id: editing } : supporterForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Erro ao salvar apoiador');
        return;
      }
      setSupporterForm(EMPTY_SUPPORTER);
      setEditingSupporterId(null);
      setSupporterBannerStats(null);
      await fetchDashboardData();
      showToast(editing ? 'Apoiador atualizado!' : 'Apoiador cadastrado!');
    } catch {
      showToast('Erro ao salvar apoiador');
    }
  };

  const handleEditSupporter = (s: Supporter) => {
    setEditingSupporterId(s.id || null);
    setSupporterBannerStats(null);
    const order = s.sort_order ?? 0;
    const isCrimson = Boolean(s.crystal_style === 'crimson' || s.is_owner || order <= -2);
    const isGold = Boolean(
      !isCrimson && (s.crystal_style === 'gold' || s.is_gold_crystal || order === -1)
    );
    setSupporterForm({
      name: s.name,
      url: s.url,
      tagline: s.tagline || '',
      role: s.role || 'Apoiador',
      avatar: s.avatar || '',
      banner_url: s.banner_url || '',
      is_owner: isCrimson,
      is_gold_crystal: isGold,
    });
  };

  const handleDeleteSupporter = async (id?: string) => {
    if (!id || !confirm('Remover este apoiador do site?')) return;
    const res = await api('/api/supporters?id=' + id, { method: 'DELETE' });
    if (res.ok) {
      setSupporters((prev) => prev.filter((s) => s.id !== id));
      showToast('Apoiador removido');
    } else {
      showToast('Erro ao remover apoiador');
    }
  };

  // Inscrições
  const handleDeleteRegistration = async (id: string) => {
    if (!confirm('Remover esta inscrição?')) return;
    const res = await api('/api/registrations?id=' + id, { method: 'DELETE' });
    if (res.ok) {
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
      showToast('Inscrição removida');
    } else {
      showToast('Erro ao remover inscrição');
    }
  };

  const filteredRegistrations = regFilter
    ? registrations.filter((r) => r.event_id === regFilter)
    : registrations;

  const eventTitle = (id: string) => events.find((e) => e.id === id)?.title || 'Evento encerrado / removido';

  const exportRegistrationsCsv = (targetEventId?: string) => {
    const list = targetEventId
      ? registrations.filter((r) => r.event_id === targetEventId)
      : filteredRegistrations;
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Evento', 'Nome', 'Usuario', 'Observacoes', 'Inscrito em'],
      ...list.map((r) => [
        eventTitle(r.event_id),
        r.name,
        r.username,
        r.notes || '',
        new Date(r.created_at).toLocaleString('pt-BR'),
      ]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    const evObj = targetEventId ? events.find((e) => e.id === targetEventId) : null;
    const slug = evObj
      ? evObj.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 35)
      : 'todos';
    a.download = `inscricoes-${slug || 'evento'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Criar ou Atualizar Evento
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidCalendarDate(eventForm.date)) {
      showToast('Data inválida! Escolha uma data válida entre 2024 e 2035.');
      return;
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(eventForm.time.trim())) {
      showToast('Horário inválido! Informe um horário válido entre 00:00 e 23:59.');
      return;
    }

    const editing = editingEventId;
    const payload = {
      ...eventForm,
      time: `${eventForm.time.trim()} BRT`,
      vrchat_world: eventForm.is_external
        ? `${eventForm.external_platform}: ${eventForm.vrchat_world.trim()}`.replace(
            new RegExp(`^${eventForm.external_platform}:\\s*${eventForm.external_platform}:\\s*`, 'i'),
            `${eventForm.external_platform}: `
          )
        : eventForm.vrchat_world.trim(),
    };

    try {
      const res = await api('/api/events', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...payload, id: editing } : payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Erro ao salvar evento');
        return;
      }

      if (editing) {
        setEvents((prev) => prev.map((ev) => (ev.id === editing ? data : ev)));
        showToast('Evento atualizado com sucesso!');
      } else {
        setEvents((prev) => [data, ...prev]);
        showToast('Evento criado com sucesso!');
      }
      setEventForm(EMPTY_EVENT);
      setEditingEventId(null);
      setEventCompressionStats(null);
    } catch (err) {
      showToast('Erro ao salvar evento');
    }
  };

  const handleEditEvent = (ev: VRChatEvent) => {
    setEditingEventId(ev.id);
    setEventCompressionStats(null);
    const isExt = Boolean(ev.is_external);
    const platform = ev.external_platform || 'TikTok Live';
    const rawWorld = ev.vrchat_world || '';
    const cleanedWorld =
      isExt && rawWorld.toLowerCase().startsWith(`${platform.toLowerCase()}:`)
        ? rawWorld.slice(platform.length + 1).trim()
        : rawWorld;

    setEventForm({
      title: ev.title || '',
      description: ev.description || '',
      date: isValidCalendarDate(ev.date) ? ev.date : '',
      time: extractHHMM(ev.time),
      vrchat_world: cleanedWorld,
      world_url: ev.world_url || '',
      image_url:
        ev.image_url && ev.image_url !== '/images/banner.jpg' ? ev.image_url : '',
      category: ev.category || (isExt ? 'Live / Sorteio' : 'Encontro Oficial'),
      is_external: isExt,
      external_platform: platform,
    });
  };

  // Excluir Evento
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Deseja realmente excluir este evento?')) return;
    try {
      const res = await api('/api/events?id=' + id, { method: 'DELETE' });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        showToast('Evento excluído');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Erro ao excluir evento');
      }
    } catch (err) {
      showToast('Erro ao excluir');
    }
  };

  // Adicionar Foto
  const handleAddGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(galleryForm),
      });

      if (res.ok) {
        const created = await res.json();
        setGallery((prev) => [created, ...prev]);
        setGalleryForm({
          title: '',
          url: '',
          author: '',
          vrchat_world: 'Lycoris Garden Sanctuary',
        });
        setCompressionStats(null);
        showToast('Foto adicionada à galeria!');
      }
    } catch (err) {
      showToast('Erro ao adicionar foto');
    }
  };

  // Reordenar e Ocultar/Exibir Fotos da Galeria
  const persistGalleryOrder = async (nextList: GalleryImage[], toastMsg?: string) => {
    setGallery(nextList);
    try {
      const res = await api('/api/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: nextList.map((g) => g.id) }),
      });
      if (res.ok && toastMsg) showToast(toastMsg);
    } catch {
      showToast('Erro ao salvar ordem da galeria');
    }
  };

  const handleMoveGallery = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= gallery.length) return;
    const next = [...gallery];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    await persistGalleryOrder(next, 'Ordem da galeria atualizada!');
  };

  const handleDropGallery = async (targetId: string) => {
    if (!draggedGalleryId || draggedGalleryId === targetId) {
      setDraggedGalleryId(null);
      return;
    }
    const fromIdx = gallery.findIndex((g) => g.id === draggedGalleryId);
    const toIdx = gallery.findIndex((g) => g.id === targetId);
    setDraggedGalleryId(null);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...gallery];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await persistGalleryOrder(next, 'Ordem da galeria atualizada!');
  };

  const handleToggleGalleryHidden = async (id: string) => {
    const target = gallery.find((g) => g.id === id);
    if (!target) return;
    const nextHiddenState = !target.hidden;
    setGallery((prev) =>
      prev.map((g) => (g.id === id ? { ...g, hidden: nextHiddenState } : g))
    );
    try {
      const res = await api('/api/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleHiddenId: id }),
      });
      if (res.ok) {
        showToast(nextHiddenState ? 'Foto ocultada do site público' : 'Foto visível novamente no site');
      } else {
        showToast('Erro ao alterar visibilidade');
      }
    } catch {
      showToast('Erro ao alterar visibilidade');
    }
  };

  // Excluir Foto
  const handleDeleteGallery = async (id: string) => {
    if (!confirm('Deseja remover esta foto da galeria?')) return;
    try {
      const res = await api('/api/gallery?id=' + id, { method: 'DELETE' });
      if (res.ok) {
        setGallery((prev) => prev.filter((g) => g.id !== id));
        showToast('Foto removida');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Erro ao excluir foto');
      }
    } catch (err) {
      showToast('Erro ao excluir');
    }
  };

  // Excluir Comentário (Moderação)
  const handleDeleteComment = async (id: string) => {
    if (!confirm('Excluir este comentário da comunidade?')) return;
    try {
      const res = await api('/api/comments?id=' + id, { method: 'DELETE' });
      if (res.ok) {
        setAllComments((prev) => prev.filter((c) => c.id !== id));
        showToast('Comentário moderado e removido');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Erro ao moderar comentário');
      }
    } catch (err) {
      showToast('Erro ao moderar comentário');
    }
  };

  // Simulação / Teste do Webhook de Feed Automático de Fotos
  const handleTriggerWebhookTest = async () => {
    setWebhookStatus('Sincronizando feed de fotos...');
    try {
      const res = await api('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'photo_uploaded',
          data: {
            title: 'Sincronização Noturna Automática',
            url:
              webhookUrlInput.trim() ||
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
            author: 'Feed_Webhook_Bot',
            vrchat_world: 'Santuário de Lycoris Radiata',
          },
        }),
      });

      if (res.ok) {
        setWebhookStatus('Foto importada com sucesso via Webhook!');
        fetchDashboardData();
        setWebhookUrlInput('');
      } else {
        setWebhookStatus('Falha ao processar webhook');
      }
    } catch (err) {
      setWebhookStatus('Erro ao executar sincronização');
    }
  };

  // Tela de Login com flores de Lycoris ao fundo
  if (!isAuthenticated) {
    return (
      <main className="relative min-h-screen bg-gothic-bg flex items-center justify-center p-4 overflow-hidden">
        <div className="relative z-10 max-w-md w-full rounded-2xl bg-zinc-950/90 border border-lycoris-900/60 p-8 shadow-lycoris-glow backdrop-blur-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-lycoris-950 border border-lycoris-700 mx-auto flex items-center justify-center text-lycoris-400">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-white tracking-wide">
              Acesso <span className="text-lycoris-500">Administrativo</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Painel de moderação e gerenciamento da comunidade Lycoris Garden
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Senha Mestra
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Digite sua senha de administrador..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-lycoris-500"
                />
                <Lock className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 text-white font-semibold text-sm shadow-lycoris-glow transition-all"
            >
              Entrar no Painel
            </button>
          </form>

          <div className="text-center">
            <Link href="/" className="text-xs text-zinc-500 hover:text-lycoris-400 transition-colors">
              &larr; Voltar para a página pública
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Painel Administrativo com flores de Lycoris ao fundo
  return (
    <main className="relative min-h-screen bg-gothic-bg text-zinc-100 p-4 sm:p-8 overflow-hidden">
      {/* Conteúdo em camada superior */}
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Toast de Notificação */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-lycoris-900 border border-lycoris-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Topo do Painel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold text-white">
                LYCORIS <span className="text-lycoris-500">ADMIN</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lycoris-950 border border-lycoris-800 text-lycoris-300 uppercase">
                Gerenciamento Ativo
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Controle de eventos, fotos da galeria e moderação de comentários da comunidade.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-zinc-300 hover:text-white px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center gap-1.5 transition-colors backdrop-blur-sm"
            >
              <span>Ver Site Público</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={fetchDashboardData}
              title="Atualizar dados"
              className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 px-3 py-2 rounded-lg bg-red-950/40 border border-red-900/60 flex items-center gap-1.5 transition-colors backdrop-blur-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação Otimizadas e Compactas (sem barra de rolagem horizontal) */}
        <div className="p-2 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md flex flex-wrap items-center gap-1.5">
          {[
            {
              id: 'events' as const,
              label: 'Eventos',
              count: events.length,
              icon: Calendar,
              visible: canAccess('events'),
            },
            {
              id: 'gallery' as const,
              label: 'Galeria',
              count: gallery.length,
              icon: ImageIcon,
              visible: canAccess('gallery'),
            },
            {
              id: 'registrations' as const,
              label: 'Inscrições',
              count: registrations.length,
              icon: Users,
              visible: canAccess('registrations'),
            },
            {
              id: 'supporters' as const,
              label: 'Apoiadores',
              count: supporters.length,
              icon: HeartHandshake,
              visible: canAccess('supporters'),
            },
            {
              id: 'stats' as const,
              label: 'Destaques',
              count: heroStats.length,
              icon: Sparkles,
              visible: canAccess('stats'),
            },
            {
              id: 'sawvr' as const,
              label: 'SawVR',
              count: sawCatalog.length,
              icon: ShoppingBag,
              goldIcon: true,
              visible: canAccess('sawvr'),
            },
            {
              id: 'submissions' as const,
              label: 'Aprovar Fotos',
              count: pendingPosts.length,
              icon: Clock,
              alertBadge: pendingPosts.length > 0,
              visible: canAccess('submissions'),
            },
            {
              id: 'comments' as const,
              label: 'Moderação',
              count: allComments.length,
              icon: MessageSquare,
              visible: canAccess('comments'),
            },
            {
              id: 'users' as const,
              label: 'Usuários & IPs',
              count: commentIdentities.length,
              icon: UserCheck,
              visible: canAccess('users'),
            },
            {
              id: 'access' as const,
              label: 'Acessos & Senhas',
              count: 2 + extraPasswords.length,
              icon: KeyRound,
              goldIcon: true,
              visible: isMasterUnlocked,
            },
          ]
            .filter((t) => t.visible)
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-lycoris-600/20 border border-lycoris-500/70 text-lycoris-200 shadow-lycoris-glow'
                      : 'bg-zinc-900/60 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      tab.goldIcon
                        ? 'text-gothic-gold'
                        : isActive
                        ? 'text-lycoris-400'
                        : 'text-zinc-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none ${
                      tab.alertBadge
                        ? 'bg-lycoris-600 text-white animate-pulse'
                        : isActive
                        ? 'bg-lycoris-950/90 text-lycoris-300 border border-lycoris-700/50'
                        : 'bg-zinc-800/80 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
        </div>

        {/* ============================================================== */}
        {/* ABA 1: EVENTOS */}
        {/* ============================================================== */}
        {activeTab === 'events' && canAccess('events') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-4 h-fit">
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-lycoris-500" />
                {editingEventId ? 'Editar Evento' : 'Novo Evento'}
              </h2>

              <form onSubmit={handleCreateEvent} className="space-y-3">
                {/* Seletor de Modalidade: No VRChat vs Fora do VRChat (Live / Sorteio / Externo) */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Onde acontecerá o evento?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEventForm((prev) => ({
                          ...prev,
                          is_external: false,
                          category:
                            prev.category === 'Live / Sorteio'
                              ? 'Encontro Oficial'
                              : prev.category,
                        }))
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                        !eventForm.is_external
                          ? 'bg-lycoris-600/20 border-lycoris-500 text-lycoris-200 shadow-lycoris-glow'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>No VRChat (Instância)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEventForm((prev) => ({
                          ...prev,
                          is_external: true,
                          category:
                            prev.category === 'Encontro Oficial'
                              ? 'Live / Sorteio'
                              : prev.category,
                        }))
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                        eventForm.is_external
                          ? 'bg-gothic-gold/15 border-gothic-gold text-gothic-gold shadow-gold-glow'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Fora do VRChat (Live/Sorteio)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Título do Evento</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder={
                      eventForm.is_external
                        ? 'Ex: Sorteio de Full Body Tracking ao Vivo'
                        : 'Ex: Noite de Chá Sob as Pétalas'
                    }
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Data (2024 – 2035)
                    </label>
                    <input
                      type="date"
                      required
                      min="2024-01-01"
                      max="2035-12-31"
                      value={eventForm.date}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Bloqueia anos com mais de 4 dígitos digitados no teclado
                        if (val && val.split('-')[0]?.length > 4) return;
                        setEventForm({ ...eventForm, date: val });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Horário (BRT)
                    </label>
                    <input
                      type="time"
                      required
                      value={eventForm.time}
                      onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                  </div>
                </div>

                {eventForm.is_external ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Plataforma / Canal
                        </label>
                        <select
                          value={eventForm.external_platform}
                          onChange={(e) =>
                            setEventForm({ ...eventForm, external_platform: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                        >
                          <option value="TikTok Live">TikTok Live</option>
                          <option value="Twitch Live">Twitch Live</option>
                          <option value="YouTube Live">YouTube Live</option>
                          <option value="Discord">Discord da Comunidade</option>
                          <option value="Instagram Live">Instagram Live</option>
                          <option value="Evento Externo">Outra Plataforma</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Perfil / Local da Transmissão
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          placeholder="Ex: @lupratuvr no TikTok"
                          value={eventForm.vrchat_world}
                          onChange={(e) =>
                            setEventForm({ ...eventForm, vrchat_world: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Link da Live / Transmissão (URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.tiktok.com/@..."
                        value={eventForm.world_url}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, world_url: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Mundo no VRChat
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        placeholder="Ex: Crimson Moon Shrine"
                        value={eventForm.vrchat_world}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, vrchat_world: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Link do Mundo (URL)
                      </label>
                      <input
                        type="url"
                        placeholder="https://vrchat.com/home/world/wrld_..."
                        value={eventForm.world_url}
                        onChange={(e) =>
                          setEventForm({ ...eventForm, world_url: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Categoria / Tag</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  >
                    <option value="Encontro Oficial">Encontro Oficial</option>
                    <option value="Live / Sorteio">Live / Sorteio</option>
                    <option value="Sorteio Especial">Sorteio Especial</option>
                    <option value="Fotografia">Fotografia</option>
                    <option value="Música Noturna">Música Noturna</option>
                    <option value="Roleplay / Imersão">Roleplay / Imersão</option>
                  </select>
                </div>

                {/* Upload opcional de imagem do mapa como fundo desfocado */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-zinc-400">
                      Imagem do Mapa / Fundo Desfocado (Opcional)
                    </label>
                    {eventForm.image_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm({ ...eventForm, image_url: '' });
                          setEventCompressionStats(null);
                        }}
                        className="text-[11px] text-red-400 hover:underline"
                      >
                        Remover fundo
                      </button>
                    )}
                  </div>

                  <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-lycoris-700/60 hover:border-lycoris-500 bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer transition-colors text-center">
                    <Upload className="w-4 h-4 text-lycoris-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      {uploadingEventImage
                        ? 'Comprimindo e enviando...'
                        : 'Enviar foto do mapa do computador (WebP automático)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingEventImage}
                      onChange={handleEventImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {eventCompressionStats && (
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{eventCompressionStats}</span>
                    </p>
                  )}

                  {eventForm.image_url && (
                    <div className="relative h-20 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={eventForm.image_url}
                        alt="Prévia do fundo"
                        className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2.5px] opacity-60"
                      />
                      <span className="relative z-10 text-[11px] font-semibold text-zinc-200 bg-black/60 px-2.5 py-1 rounded-full border border-zinc-700">
                        Prévia do Fundo Desfocado
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Descrição</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Descreva a dinâmica do encontro, dress code de avatar etc..."
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 text-white text-xs font-semibold shadow-lycoris-glow transition-all"
                  >
                    {editingEventId ? 'Salvar Alterações do Evento' : 'Salvar e Publicar Evento'}
                  </button>
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(null);
                        setEventForm(EMPTY_EVENT);
                        setEventCompressionStats(null);
                      }}
                      className="px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h2 className="font-serif text-lg font-bold text-white">Eventos Ativos ({events.length})</h2>

              <div className="space-y-3">
                {events.map((ev) => {
                  const hasBg = Boolean(ev.image_url && ev.image_url !== '/images/banner.jpg');
                  return (
                    <div
                      key={ev.id}
                      className="relative overflow-hidden p-4 rounded-xl bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md flex items-start justify-between gap-4"
                    >
                      {hasBg && (
                        <div className="pointer-events-none absolute inset-0 z-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ev.image_url}
                            alt=""
                            className="w-full h-full object-cover scale-105 blur-[3px] opacity-45"
                          />
                          <div className="absolute inset-0 bg-zinc-950/60" />
                        </div>
                      )}
                      <div className="relative z-10 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">{ev.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-lycoris-950 border border-lycoris-800 text-lycoris-300">
                            {ev.category}
                          </span>
                          {ev.is_external && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-gothic-gold/50 text-gothic-gold font-semibold">
                              {ev.external_platform || 'Fora do VRChat'}
                            </span>
                          )}
                          {hasBg && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                              Com fundo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-3 flex-wrap">
                          <span>{ev.date} às {ev.time}</span>
                          <span>•</span>
                          <span className="text-zinc-300">{ev.vrchat_world}</span>
                        </div>
                        <p className="text-xs text-zinc-400 line-clamp-2">{ev.description}</p>
                      </div>

                      <div className="relative z-10 flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleEditEvent(ev)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          title="Excluir evento"
                          className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 2: GALERIA DE FOTOS */}
        {/* ============================================================== */}
        {activeTab === 'gallery' && canAccess('gallery') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-4 h-fit">
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-lycoris-500" />
                Adicionar Foto à Galeria
              </h2>

              <form onSubmit={handleAddGalleryImage} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Título do Registro</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alvorada no Jardim Carmesim"
                    value={galleryForm.title}
                    onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-zinc-400">
                    Enviar Arquivo do PC (Compressão Automática WebP)
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-lycoris-700/60 hover:border-lycoris-500 bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer transition-colors text-center">
                    <Upload className="w-5 h-5 text-lycoris-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      {uploadingImage
                        ? 'Comprimindo e enviando...'
                        : 'Clique para escolher uma foto do computador'}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      PNG, JPG ou WebP • Convertido automaticamente para WebP leve (até 1920px)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleGalleryFileChange}
                      className="hidden"
                    />
                  </label>
                  {compressionStats && (
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{compressionStats}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Ou URL Direta da Imagem (preenchida automaticamente no upload)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://... ou faça upload do arquivo acima"
                    value={galleryForm.url}
                    onChange={(e) => setGalleryForm({ ...galleryForm, url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Autor / Fotógrafo</label>
                    <input
                      type="text"
                      required
                      placeholder="Nick no VRChat"
                      value={galleryForm.author}
                      onChange={(e) => setGalleryForm({ ...galleryForm, author: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Mundo VRChat</label>
                    <input
                      type="text"
                      placeholder="Nome da Instância"
                      value={galleryForm.vrchat_world}
                      onChange={(e) => setGalleryForm({ ...galleryForm, vrchat_world: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 text-white text-xs font-semibold shadow-lycoris-glow transition-all"
                >
                  Publicar Imagem na Galeria
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    Fotos na Galeria ({gallery.length})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Arraste os cards ou use as setas para mudar a ordem de exibição. Clique no olho para ocultar do site sem apagar.
                  </p>
                </div>
              </div>

              {gallery.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                  Nenhuma foto publicada na galeria ainda.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {gallery.map((img, idx) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => setDraggedGalleryId(img.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropGallery(img.id)}
                      onDragEnd={() => setDraggedGalleryId(null)}
                      className={`relative group rounded-xl overflow-hidden bg-zinc-900 border transition-all cursor-grab active:cursor-grabbing ${
                        draggedGalleryId === img.id
                          ? 'opacity-40 border-lycoris-500 scale-95'
                          : img.hidden
                          ? 'border-zinc-800/60 opacity-60'
                          : 'border-zinc-800 hover:border-lycoris-600/60'
                      }`}
                    >
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.title}
                          draggable={false}
                          className={`w-full h-36 object-cover ${img.hidden ? 'grayscale' : ''}`}
                        />

                        {/* Badge de posição e status */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 border border-zinc-700 text-[10px] font-bold text-zinc-200">
                            <GripVertical className="w-3 h-3 text-zinc-400" />#{idx + 1}
                          </span>
                          {img.hidden && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-950/90 border border-amber-700/70 text-[10px] font-bold text-amber-300">
                              Oculta
                            </span>
                          )}
                        </div>

                        {/* Botões de Ocultar e Excluir */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleGalleryHidden(img.id)}
                            title={img.hidden ? 'Mostrar foto no site' : 'Ocultar foto sem apagar'}
                            className={`p-1.5 rounded-md border transition-colors ${
                              img.hidden
                                ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white'
                                : 'bg-black/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                            }`}
                          >
                            {img.hidden ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGallery(img.id)}
                            title="Excluir foto permanentemente"
                            className="p-1.5 rounded-md bg-black/80 hover:bg-red-600 border border-zinc-700 hover:border-red-500 text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-white truncate">
                            {img.title}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{img.author}</div>
                        </div>

                        {/* Setas para mudar a ordem */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveGallery(idx, -1)}
                            disabled={idx === 0}
                            title="Mover para trás"
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGallery(idx, 1)}
                            disabled={idx === gallery.length - 1}
                            title="Mover para frente"
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: INSCRIÇÕES AGRUPADAS POR EVENTO */}
        {activeTab === 'registrations' && canAccess('registrations') && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-white">
                  Inscritos por Evento ({filteredRegistrations.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Inscrições separadas em blocos para cada evento ativo ou encerrado, evitando misturar participantes de eventos simultâneos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={regFilter}
                  onChange={(e) => setRegFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                >
                  <option value="">Todos os eventos ({registrations.length})</option>
                  {events.map((ev) => {
                    const count = registrations.filter((r) => r.event_id === ev.id).length;
                    return (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({count})
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => exportRegistrationsCsv(regFilter || undefined)}
                  disabled={filteredRegistrations.length === 0}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {filteredRegistrations.length === 0 && events.length === 0 ? (
              <div className="p-10 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                Nenhuma inscrição ou evento ativo até o momento.
              </div>
            ) : (
              <div className="space-y-5">
                {(() => {
                  // Agrupa inscrições por event_id
                  const groupedMap = new Map<string, EventRegistration[]>();

                  // 1. Garante que todos os eventos ativos (ou o evento filtrado) apareçam na ordem
                  events.forEach((ev) => {
                    if (!regFilter || regFilter === ev.id) {
                      groupedMap.set(ev.id, []);
                    }
                  });

                  // 2. Distribui as inscrições nos seus respectivos eventos (incluindo eventos antigos/removidos)
                  filteredRegistrations.forEach((reg) => {
                    const key = reg.event_id || 'sem-evento';
                    if (!groupedMap.has(key)) {
                      groupedMap.set(key, []);
                    }
                    groupedMap.get(key)!.push(reg);
                  });

                  const groups = Array.from(groupedMap.entries()).filter(
                    ([evId, list]) => list.length > 0 || events.some((e) => e.id === evId)
                  );

                  if (groups.length === 0) {
                    return (
                      <div className="p-10 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                        Nenhuma inscrição encontrada para o filtro selecionado.
                      </div>
                    );
                  }

                  return groups.map(([evId, evRegs]) => {
                    const evObj = events.find((e) => e.id === evId);
                    const hasBg = Boolean(
                      evObj?.image_url && evObj.image_url !== '/images/banner.jpg'
                    );

                    return (
                      <div
                        key={evId}
                        className="rounded-2xl bg-zinc-950/90 border border-zinc-800/90 overflow-hidden backdrop-blur-md shadow-xl"
                      >
                        {/* Cabeçalho do Evento */}
                        <div className="relative overflow-hidden p-4 sm:px-5 bg-zinc-900/75 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {hasBg && (
                            <div className="pointer-events-none absolute inset-0 z-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={evObj!.image_url}
                                alt=""
                                className="w-full h-full object-cover scale-105 blur-[3px] opacity-30"
                              />
                              <div className="absolute inset-0 bg-zinc-950/70" />
                            </div>
                          )}

                          <div className="relative z-10 space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Calendar className="w-4 h-4 text-lycoris-400 shrink-0" />
                              <h3 className="font-serif font-bold text-sm sm:text-base text-white truncate">
                                {evObj ? evObj.title : 'Evento Encerrado / Removido'}
                              </h3>
                              {evObj?.category && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lycoris-950 border border-lycoris-800 text-lycoris-300 font-semibold">
                                  {evObj.category}
                                </span>
                              )}
                              {evObj?.is_external && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-gothic-gold/50 text-gothic-gold font-semibold">
                                  {evObj.external_platform || 'Fora do VRChat'}
                                </span>
                              )}
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold">
                                {evRegs.length}{' '}
                                {evRegs.length === 1 ? 'inscrito' : 'inscritos'}
                              </span>
                            </div>

                            {evObj ? (
                              <p className="text-[11px] text-zinc-400">
                                {evObj.date} às {evObj.time} •{' '}
                                <span className="text-zinc-300">{evObj.vrchat_world}</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-zinc-500">ID do evento: {evId}</p>
                            )}
                          </div>

                          {evRegs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => exportRegistrationsCsv(evId)}
                              className="relative z-10 px-3 py-1.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-center shrink-0 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-lycoris-400" />
                              <span>CSV deste Evento</span>
                            </button>
                          )}
                        </div>

                        {/* Lista de Inscritos deste Evento */}
                        {evRegs.length === 0 ? (
                          <div className="p-6 text-center text-xs text-zinc-500 italic">
                            Nenhum participante inscrito neste evento ainda.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="text-zinc-400 bg-zinc-950/50 border-b border-zinc-800/80">
                                <tr>
                                  <th className="p-3 sm:px-5 font-semibold w-10">#</th>
                                  <th className="p-3 font-semibold">Nome</th>
                                  <th className="p-3 font-semibold">
                                    {evObj?.is_external
                                      ? 'Usuário (Rede / VRChat)'
                                      : 'Usuário VRChat'}
                                  </th>
                                  <th className="p-3 font-semibold">Observações</th>
                                  <th className="p-3 font-semibold">Inscrito em</th>
                                  <th className="p-3 sm:px-5 text-right font-semibold">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-900">
                                {evRegs.map((r, idx) => (
                                  <tr
                                    key={r.id}
                                    className="hover:bg-zinc-900/40 transition-colors"
                                  >
                                    <td className="p-3 sm:px-5 text-zinc-500 font-mono">
                                      {idx + 1}
                                    </td>
                                    <td className="p-3 text-white font-medium">{r.name}</td>
                                    <td className="p-3 text-lycoris-400 font-semibold">
                                      {r.username}
                                    </td>
                                    <td
                                      className="p-3 text-zinc-400 max-w-[260px] truncate"
                                      title={r.notes || ''}
                                    >
                                      {r.notes || '—'}
                                    </td>
                                    <td className="p-3 text-zinc-500 whitespace-nowrap">
                                      {new Date(r.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="p-3 sm:px-5 text-right">
                                      <button
                                        onClick={() => handleDeleteRegistration(r.id)}
                                        title="Remover inscrição"
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* ABA: APOIADORES */}
        {activeTab === 'supporters' && canAccess('supporters') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-4 h-fit">
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-gothic-gold" />
                {editingSupporterId ? 'Editar Apoiador' : 'Novo Apoiador'}
              </h2>
              <form onSubmit={handleSaveSupporter} className="space-y-3">
                {([
                  ['name', 'Nome', 'Ex: LupratuVR', 'text', true],
                  ['url', 'Link do projeto (URL)', 'https://...', 'url', true],
                  ['role', 'Título / Papel', 'Ex: Parceira Criativa', 'text', true],
                  ['tagline', 'Descrição curta', 'Ex: Vtuber & Streamer.', 'text', false],
                  ['avatar', 'Imagem / Logo (URL, opcional)', 'https://...', 'url', false],
                ] as const).map(([key, label, ph, type, req]) => (
                  <div key={key}>
                    <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                    <input
                      type={type}
                      required={req}
                      placeholder={ph}
                      value={supporterForm[key]}
                      onChange={(e) => setSupporterForm({ ...supporterForm, [key]: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                    {key === 'avatar' && (
                      <label className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-lycoris-300 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingAvatar ? 'Comprimindo...' : 'Ou enviar logo do PC'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingAvatar}
                          onChange={handleSupporterAvatarFile}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ))}

                {/* Plano de Fundo Desfocado Exclusivo da Página /apoiadores */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-zinc-400">
                      Plano de Fundo do Card na Página de Apoiadores (Desfocado, opcional)
                    </label>
                    {supporterForm.banner_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupporterForm({ ...supporterForm, banner_url: '' });
                          setSupporterBannerStats(null);
                        }}
                        className="text-[11px] text-red-400 hover:underline"
                      >
                        Remover fundo
                      </button>
                    )}
                  </div>

                  <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-gothic-gold/50 hover:border-gothic-gold bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer transition-colors text-center">
                    <Upload className="w-4 h-4 text-gothic-gold" />
                    <span className="text-xs font-semibold text-zinc-200">
                      {uploadingSupporterBanner
                        ? 'Comprimindo e enviando...'
                        : 'Enviar plano de fundo do PC (WebP automático)'}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Exibido apenas na página /apoiadores (o carrossel mantém o padrão)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingSupporterBanner}
                      onChange={handleSupporterBannerFile}
                      className="hidden"
                    />
                  </label>

                  {supporterBannerStats && (
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{supporterBannerStats}</span>
                    </p>
                  )}

                  <input
                    type="url"
                    placeholder="Ou cole a URL da imagem de fundo..."
                    value={supporterForm.banner_url}
                    onChange={(e) =>
                      setSupporterForm({ ...supporterForm, banner_url: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />

                  {supporterForm.banner_url && (
                    <div className="relative h-20 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={supporterForm.banner_url}
                        alt="Prévia do fundo do apoiador"
                        className="absolute inset-0 w-full h-full object-cover scale-105 blur-[2.4px] opacity-60"
                      />
                      <span className="relative z-10 text-[11px] font-semibold text-zinc-200 bg-black/65 px-2.5 py-1 rounded-full border border-zinc-700">
                        Prévia do Fundo Desfocado (/apoiadores)
                      </span>
                    </div>
                  )}
                </div>

                {/* Toggle Efeito Cristal Glass Vermelho (Dona / Destaque) */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-lycoris-950/70 via-zinc-900 to-zinc-950 border border-lycoris-700/50 hover:border-lycoris-500 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={supporterForm.is_owner}
                    onChange={(e) =>
                      setSupporterForm({
                        ...supporterForm,
                        is_owner: e.target.checked,
                        is_gold_crystal: e.target.checked ? false : supporterForm.is_gold_crystal,
                      })
                    }
                    className="mt-0.5 w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-lycoris-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-lycoris-400" />
                      Destaque Carmesim Cristal Glass (Dona / Fundadora)
                    </span>
                    <span className="block text-[11px] text-zinc-400 leading-snug">
                      Troca o brilho dourado por vermelho carmesim translúcido em estilo cristal glass.
                    </span>
                  </div>
                </label>

                {/* Toggle Efeito Cristal Glass Dourado */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-[#2c2107]/70 via-zinc-900 to-zinc-950 border border-gold-500/45 hover:border-gold-400 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={supporterForm.is_gold_crystal}
                    onChange={(e) =>
                      setSupporterForm({
                        ...supporterForm,
                        is_gold_crystal: e.target.checked,
                        is_owner: e.target.checked ? false : supporterForm.is_owner,
                      })
                    }
                    className="mt-0.5 w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-gold-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                      Destaque Dourado Cristal Glass (Parceiro VIP)
                    </span>
                    <span className="block text-[11px] text-zinc-400 leading-snug">
                      Aplica o efeito translúcido em estilo cristal glass na temática dourada do site.
                    </span>
                  </div>
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 text-white text-xs font-semibold shadow-lycoris-glow transition-all"
                  >
                    {editingSupporterId ? 'Salvar Alterações' : 'Cadastrar Apoiador'}
                  </button>
                  {editingSupporterId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupporterId(null);
                        setSupporterForm(EMPTY_SUPPORTER);
                      }}
                      className="px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-3">
              <h2 className="font-serif text-lg font-bold text-white">Apoiadores no Site ({supporters.length})</h2>
              {supporters.length === 0 && (
                <div className="p-8 text-center text-zinc-500 text-xs">Nenhum apoiador cadastrado.</div>
              )}
              {supporters.map((s) => (
                <div
                  key={s.id || s.name}
                  className="p-4 rounded-xl bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{s.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          (s.sort_order ?? 0) <= -2
                            ? 'bg-lycoris-950/80 border-lycoris-500/50 text-lycoris-300 font-semibold'
                            : 'border-gothic-gold/30 text-gothic-gold'
                        }`}
                      >
                        {s.role}
                      </span>
                      {(s.sort_order ?? 0) <= -2 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-lycoris-600/20 border border-lycoris-500/40 text-lycoris-300 font-semibold">
                          Cristal Carmesim
                        </span>
                      )}
                      {(s.sort_order ?? 0) === -1 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gothic-gold/15 border border-gothic-gold/50 text-gothic-gold font-semibold">
                          Cristal Dourado
                        </span>
                      )}
                      {s.banner_url && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                          Com fundo em /apoiadores
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{s.tagline}</p>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-lycoris-400 hover:underline truncate block">
                      {s.url}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEditSupporter(s)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteSupporter(s.id)}
                      title="Remover"
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: DESTAQUES DO TOPO (CAIXAS DO BANNER) */}
        {activeTab === 'stats' && canAccess('stats') && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-white">
                Caixas de Destaque do Banner Principal
              </h2>
              <p className="text-xs text-zinc-400">
                Edite os números, títulos e cores das 4 caixas que ficam no topo do site (ex: Membros Ativos, Encontros Noturnos, PC &amp; Quest, Atmosfera Gótica).
              </p>
            </div>

            <form onSubmit={handleSaveHeroStats} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {heroStats.map((stat, idx) => (
                  <div
                    key={stat.id || idx}
                    className="p-5 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        Caixa #{idx + 1}
                      </span>
                      <span
                        className={`font-serif text-lg font-bold ${
                          stat.color === 'gothic-gold'
                            ? 'text-gothic-gold'
                            : stat.color === 'white'
                            ? 'text-white'
                            : stat.color === 'lycoris-500'
                            ? 'text-lycoris-500'
                            : 'text-lycoris-400'
                        }`}
                      >
                        {stat.value || '—'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Valor Principal (Destaque)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={40}
                        placeholder="Ex: 1.2K+"
                        value={stat.value}
                        onChange={(e) => handleStatChange(idx, 'value', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm font-semibold focus:outline-none focus:border-lycoris-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Legenda Inferior
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        placeholder="Ex: Membros Ativos"
                        value={stat.label}
                        onChange={(e) => handleStatChange(idx, 'label', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Cor do Número/Texto
                      </label>
                      <select
                        value={stat.color || 'lycoris-400'}
                        onChange={(e) => handleStatChange(idx, 'color', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                      >
                        <option value="lycoris-400">Rosa Carmesim Claro</option>
                        <option value="lycoris-500">Vermelho Lycoris</option>
                        <option value="gothic-gold">Dourado Gótico</option>
                        <option value="white">Branco Puro</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingStats}
                  className="px-6 py-3 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lycoris-glow transition-all"
                >
                  {savingStats ? 'Salvando...' : 'Salvar Alterações nos Destaques'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: CATÁLOGO SAWVR (NÍVEL 2) */}
        {/* ============================================================== */}
        {activeTab === 'sawvr' && canAccess('sawvr') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-4 h-fit">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-gothic-gold" />
                  {editingSawId ? 'Editar Anúncio SawVR' : 'Novo Anúncio SawVR'}
                </h2>
                <Link
                  href="/sawvr"
                  target="_blank"
                  className="text-[11px] text-gothic-gold hover:underline flex items-center gap-1"
                >
                  <span>Abrir /sawvr</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <form onSubmit={handleSaveSawItem} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nome do Equipamento / Produto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Meta Quest 3 128GB ou Kit 3x Vive Tracker 3.0"
                    value={sawForm.title}
                    onChange={(e) => setSawForm({ ...sawForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-gothic-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Preço / Valor</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: R$ 3.490 ou Sob Consulta"
                      value={sawForm.price}
                      onChange={(e) => setSawForm({ ...sawForm, price: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-gothic-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Categoria</label>
                    <select
                      value={sawForm.category}
                      onChange={(e) => setSawForm({ ...sawForm, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-gothic-gold"
                    >
                      <option value="Headset VR">Headset VR</option>
                      <option value="Full Body Tracking">Full Body Tracking</option>
                      <option value="Acessórios VR">Acessórios VR</option>
                      <option value="Hardware & PC">Hardware &amp; PC</option>
                      <option value="Áudio & Periféricos">Áudio &amp; Periféricos</option>
                      <option value="Outros Eletrônicos">Outros Eletrônicos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Condição do Item</label>
                    <select
                      value={sawForm.condition}
                      onChange={(e) => setSawForm({ ...sawForm, condition: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-gothic-gold"
                    >
                      <option value="Novo / Lacrado">Novo / Lacrado</option>
                      <option value="Seminovo">Seminovo</option>
                      <option value="Sob Encomenda">Sob Encomenda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Link de Contato (Discord/WhatsApp)</label>
                    <input
                      type="url"
                      required
                      placeholder="https://discord.gg/..."
                      value={sawForm.contact_url}
                      onChange={(e) => setSawForm({ ...sawForm, contact_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-gothic-gold"
                    />
                  </div>
                </div>

                {/* Upload da foto do produto com compressão automática WebP */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs text-zinc-400">
                    Foto do Produto (Compressão Automática WebP)
                  </label>
                  <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-gothic-gold/50 hover:border-gothic-gold bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer transition-colors text-center">
                    <Upload className="w-4 h-4 text-gothic-gold" />
                    <span className="text-xs font-semibold text-zinc-200">
                      {uploadingSawImage
                        ? 'Comprimindo e enviando...'
                        : 'Enviar foto do equipamento do PC'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingSawImage}
                      onChange={handleSawImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {sawCompressionStats && (
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{sawCompressionStats}</span>
                    </p>
                  )}

                  <input
                    type="url"
                    placeholder="Ou cole a URL da imagem do produto..."
                    value={sawForm.image_url}
                    onChange={(e) => setSawForm({ ...sawForm, image_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-gothic-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Descrição / Especificações
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detalhes do item, itens inclusos na caixa, garantia, formas de envio..."
                    value={sawForm.description}
                    onChange={(e) => setSawForm({ ...sawForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-gothic-gold resize-none"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sawForm.available}
                      onChange={(e) => setSawForm({ ...sawForm, available: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span>Disponível em estoque</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gothic-gold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sawForm.featured}
                      onChange={(e) => setSawForm({ ...sawForm, featured: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span>Destacar anúncio</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gothic-gold hover:bg-amber-400 text-black text-xs font-bold shadow-gold-glow transition-all"
                  >
                    {editingSawId ? 'Salvar Alterações' : 'Publicar no Catálogo SawVR'}
                  </button>
                  {editingSawId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSawId(null);
                        setSawForm(EMPTY_SAW_ITEM);
                        setSawCompressionStats(null);
                      }}
                      className="px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h2 className="font-serif text-lg font-bold text-white">
                Itens no Catálogo SawVR ({sawCatalog.length})
              </h2>

              {sawCatalog.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                  Nenhum anúncio publicado no catálogo SawVR ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {sawCatalog.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-14 h-14 rounded-xl object-cover border border-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm truncate">
                              {item.title}
                            </span>
                            <span className="font-serif font-bold text-xs text-gothic-gold">
                              {item.price}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                              {item.category}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                item.available
                                  ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
                                  : 'bg-zinc-900 border border-zinc-700 text-zinc-400'
                              }`}
                            >
                              {item.available ? 'Disponível' : 'Indisponível'}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-zinc-400 line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSawAvailable(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs"
                          title="Alternar disponibilidade"
                        >
                          {item.available ? 'Esgotar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditSawItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSawItem(item.id)}
                          title="Remover anúncio"
                          className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 3: MODERAÇÃO DE COMENTÁRIOS */}
        {/* ============================================================== */}
        {activeTab === 'comments' && canAccess('comments') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-4 h-fit">
              <div>
                <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-lycoris-500" />
                  Filtro Automático de Comentários
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Regras já ativas automaticamente: limite de <strong>150 caracteres</strong>, bloqueio de <strong>links</strong>, <strong>emojis</strong>, <strong>símbolos especiais</strong> e lista nativa de palavrões/ofensas em PT-BR e EN.
                </p>
              </div>

              <form onSubmit={handleAddBlockedWord} className="space-y-2">
                <label className="block text-xs text-zinc-300 font-semibold">
                  Adicionar Palavra Sensível Extra ao Bloqueio
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={40}
                    placeholder="Digite uma palavra para bloquear..."
                    value={newBlockedWord}
                    onChange={(e) => setNewBlockedWord(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />
                  <button
                    type="submit"
                    disabled={savingBlockedWords || newBlockedWord.trim().length < 2}
                    className="px-4 py-2 rounded-lg bg-lycoris-600 hover:bg-lycoris-500 disabled:opacity-40 text-white text-xs font-semibold"
                  >
                    Bloquear
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <span className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                  Palavras Extras Bloqueadas ({customBlockedWords.length})
                </span>
                {customBlockedWords.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    Nenhuma palavra extra adicionada (o filtro padrão de palavrões já está ativo).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {customBlockedWords.map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                      >
                        <span>{w}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlockedWord(w)}
                          className="text-zinc-500 hover:text-red-400"
                          title="Remover palavra"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Nicks Vinculados por IP (Anti-Falsificação) */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-2.5">
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-lycoris-400 font-bold">
                    Identidades Vinculadas por IP ({commentIdentities.length})
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    Cada visitante fica travado ao primeiro nick utilizado no seu IP/dispositivo e não pode se passar por outros membros.
                  </p>
                </div>

                {commentIdentities.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    Nenhum vínculo de IP registrado ainda. Assim que alguém comentar, o nick e o ID do IP aparecerão aqui.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {commentIdentities.map((idItem) => (
                      <div
                        key={idItem.ipHash}
                        className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-white truncate">
                              {idItem.authorName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-[10px] font-mono text-zinc-300">
                              IP {idItem.ipTag}
                            </span>
                            {idItem.blocked && (
                              <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-700 text-[10px] font-bold text-red-300">
                                IP Bloqueado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleBlockIp(idItem.ipTag)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              idItem.blocked
                                ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-700 text-emerald-200'
                                : 'bg-amber-950/70 hover:bg-amber-900 border-amber-700 text-amber-200'
                            }`}
                          >
                            {idItem.blocked ? 'Desbloquear' : 'Banir IP'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleReleaseNickIp(idItem.ipTag, idItem.authorName)
                            }
                            title="Destravar nick deste IP"
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
                          >
                            Liberar Nick
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-white">
                  Fila de Moderação por Postagem ({allComments.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Comentários agrupados em suas respectivas fotos da galeria para facilitar a identificação e moderação.
                </p>
              </div>

              {allComments.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                  Nenhum comentário registrado na plataforma no momento.
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(
                    allComments.reduce<Record<string, CommentItem[]>>((acc, comm) => {
                      const key = comm.image_id || 'unknown';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(comm);
                      return acc;
                    }, {})
                  ).map(([imageId, groupComments]) => {
                    const photo = gallery.find((g) => g.id === imageId);
                    return (
                      <div
                        key={imageId}
                        className="rounded-2xl bg-zinc-950/90 border border-zinc-800/90 overflow-hidden backdrop-blur-md"
                      >
                        {/* Cabeçalho da Foto / Postagem */}
                        <div className="p-4 bg-zinc-900/70 border-b border-zinc-800 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {photo?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-12 h-12 rounded-xl object-cover border border-lycoris-800/60 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-serif font-bold text-sm text-white truncate">
                                  {photo?.title || 'Postagem da Galeria'}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lycoris-950 border border-lycoris-800 text-lycoris-300 font-semibold">
                                  {groupComments.length}{' '}
                                  {groupComments.length === 1 ? 'comentário' : 'comentários'}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {photo
                                  ? `Por ${photo.author} • ${photo.vrchat_world || 'Lycoris Garden Sanctuary'}`
                                  : `ID da foto: ${imageId}`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Lista de Comentários desta Foto */}
                        <div className="divide-y divide-zinc-800/70">
                          {groupComments.map((comm) => (
                            <div
                              key={comm.id}
                              className="p-3.5 sm:px-4 flex items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-lycoris-400 text-xs">
                                    {comm.author_name}
                                  </span>
                                  {comm.ip_tag && (
                                    <span
                                      title="Identificador único do IP de quem comentou"
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                                        comm.ip_blocked
                                          ? 'bg-red-950/80 border-red-700 text-red-300'
                                          : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                                      }`}
                                    >
                                      IP {comm.ip_tag}
                                      {comm.ip_blocked ? ' (Banido)' : ''}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-zinc-500">
                                    {new Date(comm.created_at).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-200 break-words">{comm.content}</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {comm.ip_tag && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlockIp(comm.ip_tag!)}
                                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                      comm.ip_blocked
                                        ? 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-800 text-emerald-200'
                                        : 'bg-amber-950/60 hover:bg-amber-900 border-amber-800 text-amber-200'
                                    }`}
                                  >
                                    {comm.ip_blocked ? 'Desbloquear IP' : 'Banir IP'}
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteComment(comm.id)}
                                  className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: POSTS DA COMUNIDADE PENDENTES DE APROVAÇÃO (NÍVEL 2) */}
        {/* ============================================================== */}
        {activeTab === 'submissions' && canAccess('submissions') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-zinc-950/85 border border-lycoris-900/50 backdrop-blur-md">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-lycoris-400" />
                  Fila de Aprovação — Posts da Comunidade ({pendingPosts.length})
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Fotos enviadas pelos membros na página /galeria. Analise cada captura e clique em Aprovar para publicá-la na galeria oficial ou Recusar para descartá-la.
                </p>
              </div>
              <Link
                href="/galeria#enviar-foto"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 font-semibold self-start sm:self-center shrink-0"
              >
                <span>Ver Formulário Público</span>
                <ExternalLink className="w-3.5 h-3.5 text-lycoris-400" />
              </Link>
            </div>

            {pendingPosts.length === 0 ? (
              <div className="p-12 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
                <CheckCircle2 className="w-9 h-9 text-emerald-400/70 mx-auto" />
                <h3 className="font-serif text-base font-bold text-white">
                  Nenhum post pendente de análise
                </h3>
                <p className="text-xs text-zinc-500">
                  Todos os envios da comunidade já foram avaliados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl bg-zinc-950/90 border border-zinc-800/90 overflow-hidden flex flex-col justify-between shadow-xl backdrop-blur-md"
                  >
                    <div>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative aspect-[4/3] bg-black overflow-hidden group"
                        title="Clique para abrir a imagem em tamanho original"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                          Aguardando Aprovação
                        </span>
                      </a>

                      <div className="p-4 space-y-2">
                        <h3 className="font-serif text-base font-bold text-white leading-snug">
                          {post.title}
                        </h3>
                        <div className="text-xs text-zinc-400 space-y-1">
                          <div>
                            Enviado por:{' '}
                            <strong className="text-zinc-200">{post.author}</strong>
                          </div>
                          <div>
                            Mundo:{' '}
                            <span className="text-lycoris-300">
                              {post.vrchat_world || 'Lycoris Garden Sanctuary'}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Data: {new Date(post.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={processingPostId === post.id}
                        onClick={() => handleApproveCommunityPost(post.id)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aprovar e Publicar</span>
                      </button>

                      <button
                        type="button"
                        disabled={processingPostId === post.id}
                        onClick={() => handleRejectCommunityPost(post.id)}
                        className="py-2.5 px-3.5 rounded-xl bg-red-950/70 hover:bg-red-900 disabled:opacity-40 border border-red-800 text-red-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Recusar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: USUÁRIOS REGISTRADOS & VÍNCULOS POR IP */}
        {/* ============================================================== */}
        {activeTab === 'users' && canAccess('users') && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/90 border border-lycoris-900/50 backdrop-blur-md">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-lycoris-400" />
                  Usuários Registrados por IP ({commentIdentities.length})
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Todos os membros que já comentaram na galeria ficam registrados aqui com seu identificador único de IP. Você pode editar o nome vinculado, desvincular o IP para permitir que a pessoa escolha outro nome, ou banir o IP.
                </p>
              </div>

              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por nick ou IP #..."
                  value={identitySearch}
                  onChange={(e) => setIdentitySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                />
              </div>
            </div>

            {commentIdentities.length === 0 ? (
              <div className="p-12 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
                <UserCheck className="w-9 h-9 text-zinc-600 mx-auto" />
                <h3 className="font-serif text-base font-bold text-white">
                  Nenhum usuário vinculado ainda
                </h3>
                <p className="text-xs text-zinc-500">
                  Assim que os visitantes comentarem nas fotos da galeria, seus nomes e identificadores de IP aparecerão listados aqui.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800/90 overflow-hidden backdrop-blur-md shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-zinc-400 bg-zinc-900/70 border-b border-zinc-800">
                      <tr>
                        <th className="p-3.5 sm:px-5 font-semibold">Identificador do IP</th>
                        <th className="p-3.5 font-semibold">Nome / Nick Vinculado</th>
                        <th className="p-3.5 font-semibold">Status</th>
                        <th className="p-3.5 font-semibold">Última Atualização</th>
                        <th className="p-3.5 sm:px-5 text-right font-semibold">
                          Gerenciar Vínculo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {commentIdentities
                        .filter((item) => {
                          const q = identitySearch.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            item.authorName.toLowerCase().includes(q) ||
                            item.ipTag.toLowerCase().includes(q)
                          );
                        })
                        .map((item) => {
                          const isEditingThis = editingIdentityIpTag === item.ipTag;
                          return (
                            <tr
                              key={item.ipHash}
                              className="hover:bg-zinc-900/40 transition-colors"
                            >
                              <td className="p-3.5 sm:px-5 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-zinc-200 font-semibold">
                                  IP {item.ipTag}
                                </span>
                              </td>

                              <td className="p-3.5">
                                {isEditingThis ? (
                                  <div className="flex items-center gap-2 max-w-xs">
                                    <input
                                      type="text"
                                      maxLength={40}
                                      value={editingIdentityName}
                                      onChange={(e) => setEditingIdentityName(e.target.value)}
                                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-lycoris-500 text-white text-xs focus:outline-none"
                                      placeholder="Novo nome..."
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditNickIp(item.ipTag)}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingIdentityIpTag(null);
                                        setEditingIdentityName('');
                                      }}
                                      className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-white text-sm">
                                    {item.authorName}
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5 whitespace-nowrap">
                                {item.blocked ? (
                                  <span className="px-2.5 py-1 rounded-full bg-red-950/90 border border-red-700/70 text-red-300 text-[11px] font-bold">
                                    IP Banido
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold">
                                    Vinculado &amp; Ativo
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5 text-zinc-400 whitespace-nowrap">
                                {new Date(item.updatedAt).toLocaleString('pt-BR')}
                              </td>

                              <td className="p-3.5 sm:px-5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {!isEditingThis && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingIdentityIpTag(item.ipTag);
                                        setEditingIdentityName(item.authorName);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-lycoris-400" />
                                      <span>Editar Nome</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReleaseNickIp(item.ipTag, item.authorName)
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                                    title="Desvincular este nome do IP para que o usuário possa escolher outro"
                                  >
                                    Desvincular IP
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlockIp(item.ipTag)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                      item.blocked
                                        ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-700 text-emerald-200'
                                        : 'bg-red-950/70 hover:bg-red-900 border-red-800 text-red-200'
                                    }`}
                                  >
                                    {item.blocked ? 'Desbloquear IP' : 'Banir IP'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: ACESSOS & SENHAS (EXCLUSIVO ADMIN NÍVEL 2) */}
        {/* ============================================================== */}
        {activeTab === 'access' && isMasterUnlocked && (
          <div className="space-y-8">
            {/* Bloco 1: Caixinhas de Permissões do Admin Nível 1 */}
            <div className="p-6 rounded-2xl bg-zinc-950/90 border border-lycoris-900/50 backdrop-blur-md space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-lycoris-400" />
                    Permissões de Módulos do Admin Nível 1
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Ative ou desative as caixinhas abaixo para escolher exatamente quais abas quem entra com senha de Nível 1 pode visualizar e editar.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-lycoris-950 border border-lycoris-700/60 text-lycoris-300 text-[11px] font-semibold self-start sm:self-center shrink-0">
                  Salvamento Automático ao Marcar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {(
                  [
                    {
                      key: 'events' as AdminModuleKey,
                      title: 'Eventos',
                      desc: 'Criar, editar e remover eventos do calendário.',
                    },
                    {
                      key: 'gallery' as AdminModuleKey,
                      title: 'Galeria de Fotos',
                      desc: 'Publicar fotos, reordenar e ocultar imagens.',
                    },
                    {
                      key: 'registrations' as AdminModuleKey,
                      title: 'Inscrições',
                      desc: 'Visualizar lista de inscritos por evento e baixar CSV.',
                    },
                    {
                      key: 'supporters' as AdminModuleKey,
                      title: 'Apoiadores',
                      desc: 'Gerenciar apoiadores, fundos e destaques Cristal Glass.',
                    },
                    {
                      key: 'stats' as AdminModuleKey,
                      title: 'Destaques do Topo',
                      desc: 'Editar as 4 caixas de estatísticas do banner inicial.',
                    },
                    {
                      key: 'sawvr' as AdminModuleKey,
                      title: 'Catálogo SawVR',
                      desc: 'Publicar e gerenciar produtos na loja /sawvr.',
                    },
                    {
                      key: 'submissions' as AdminModuleKey,
                      title: 'Aprovar Fotos',
                      desc: 'Aprovar ou recusar fotos enviadas pela comunidade.',
                    },
                    {
                      key: 'comments' as AdminModuleKey,
                      title: 'Moderação',
                      desc: 'Excluir comentários e gerenciar palavras bloqueadas.',
                    },
                    {
                      key: 'users' as AdminModuleKey,
                      title: 'Usuários & IPs',
                      desc: 'Visualizar nicks vinculados por IP, editar nomes e desvincular/banir IPs.',
                    },
                  ] as const
                ).map((item) => {
                  const enabled = Boolean(level1Modules[item.key]);
                  return (
                    <label
                      key={item.key}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all select-none ${
                        enabled
                          ? 'bg-gradient-to-br from-lycoris-950/60 via-zinc-900/90 to-zinc-950 border-lycoris-500/70 shadow-lycoris-glow'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={savingAccess}
                        onChange={() => handleToggleLevel1Module(item.key)}
                        className="mt-0.5 w-4 h-4 accent-rose-600 rounded cursor-pointer shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{item.title}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              enabled
                                ? 'bg-emerald-950/90 border border-emerald-600/60 text-emerald-300'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {enabled ? 'Liberado' : 'Bloqueado'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug">{item.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bloco 2: Trocar Senhas Principais & Cadastrar Novas Senhas de Acesso */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Coluna Esquerda: Alterar Senhas Principais (Nível 1 e Nível 2) */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md space-y-4 h-fit">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-gothic-gold" />
                    Senhas Principais do Painel
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Altere diretamente a senha padrão de Nível 1 ou a sua senha mestra de Nível 2.
                  </p>
                </div>

                <form onSubmit={handleSaveMainPasswords} className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-300 font-semibold mb-1">
                      Senha Padrão — Admin Nível 1
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={level1PasswordEdit}
                      onChange={(e) => setLevel1PasswordEdit(e.target.value)}
                      placeholder="Senha do Admin Nível 1"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-lycoris-500"
                    />
                    <span className="block text-[11px] text-zinc-500 mt-1">
                      Acessa apenas os módulos marcados como &ldquo;Liberado&rdquo; acima.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs text-gothic-gold font-semibold mb-1">
                      Senha Mestra — Admin Principal (Nível 2)
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      value={level2PasswordEdit}
                      onChange={(e) => setLevel2PasswordEdit(e.target.value)}
                      placeholder="Senha do Admin Nível 2"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-gothic-gold/50 text-white text-xs font-mono focus:outline-none focus:border-gothic-gold"
                    />
                    <span className="block text-[11px] text-zinc-500 mt-1">
                      Acesso total a todas as abas e ao controle de permissões e senhas.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAccess}
                    className="w-full py-2.5 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lycoris-glow transition-all"
                  >
                    {savingAccess ? 'Salvando...' : 'Salvar Senhas Principais'}
                  </button>
                </form>
              </div>

              {/* Coluna Direita: Cadastrar Outras Senhas de Acesso (Moderadores / Equipe) */}
              <div className="lg:col-span-7 p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md space-y-5">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-lycoris-500" />
                    Cadastrar Outras Senhas de Acesso
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Crie senhas individuais para membros da equipe ou moderadores (escolha se a senha terá acesso Nível 1 ou Nível 2). Você pode revogar qualquer senha quando quiser.
                  </p>
                </div>

                <form
                  onSubmit={handleAddExtraPassword}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Nome / Identificação
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={50}
                      placeholder="Ex: Moderação Eventos"
                      value={newExtraPassForm.label}
                      onChange={(e) =>
                        setNewExtraPassForm({ ...newExtraPassForm, label: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Senha de Acesso
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={60}
                      placeholder="Digite a nova senha..."
                      value={newExtraPassForm.password}
                      onChange={(e) =>
                        setNewExtraPassForm({ ...newExtraPassForm, password: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-lycoris-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-zinc-400 mb-1">Nível</label>
                    <select
                      value={newExtraPassForm.level}
                      onChange={(e) =>
                        setNewExtraPassForm({
                          ...newExtraPassForm,
                          level: Number(e.target.value) === 2 ? 2 : 1,
                        })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    >
                      <option value={1}>Nível 1</option>
                      <option value={2}>Nível 2</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      disabled={savingAccess}
                      className="w-full py-2 px-3 rounded-lg bg-lycoris-600 hover:bg-lycoris-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  <span className="block text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                    Senhas Extras Cadastradas ({extraPasswords.length})
                  </span>

                  {extraPasswords.length === 0 ? (
                    <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/70 text-center text-xs text-zinc-500">
                      Nenhuma senha extra cadastrada no momento. Apenas as duas senhas principais estão ativas.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {extraPasswords.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-xs">
                                {item.label}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  item.level === 2
                                    ? 'bg-gothic-gold/15 border border-gothic-gold/50 text-gothic-gold'
                                    : 'bg-lycoris-950 border border-lycoris-800 text-lycoris-300'
                                }`}
                              >
                                Nível {item.level}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 flex items-center gap-2">
                              <span>Senha:</span>
                              <code className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-[11px]">
                                {item.password}
                              </code>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteExtraPassword(item.id)}
                            title="Revogar senha"
                            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
