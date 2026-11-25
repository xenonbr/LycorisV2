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
} from 'lucide-react';
import { VRChatEvent, GalleryImage, CommentItem, Supporter, EventRegistration, HeroStat } from '@/lib/types';
import { INITIAL_EVENTS, INITIAL_GALLERY, INITIAL_HERO_STATS } from '@/lib/mockData';
import LycorisParticles from '@/components/LycorisParticles';

const TOKEN_KEY = 'lycoris_admin_token';

// fetch autenticado com o token de administrador
function api(url: string, init: RequestInit = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY) || '';
  return fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  });
}

const EMPTY_SUPPORTER = {
  name: '',
  url: '',
  tagline: '',
  role: 'Apoiador',
  avatar: '',
  is_owner: false,
};
const EMPTY_EVENT = {
  title: '',
  description: '',
  date: '',
  time: '21:30 BRT',
  vrchat_world: '',
  world_url: '',
  image_url: '',
  category: 'Encontro Oficial',
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
  const [activeTab, setActiveTab] = useState<
    'events' | 'registrations' | 'supporters' | 'gallery' | 'comments' | 'stats'
  >('events');

  // Estados de dados
  const [events, setEvents] = useState<VRChatEvent[]>(INITIAL_EVENTS);
  const [gallery, setGallery] = useState<GalleryImage[]>(INITIAL_GALLERY);
  const [allComments, setAllComments] = useState<CommentItem[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [heroStats, setHeroStats] = useState<HeroStat[]>(INITIAL_HERO_STATS);
  const [savingStats, setSavingStats] = useState(false);
  const [customBlockedWords, setCustomBlockedWords] = useState<string[]>([]);
  const [newBlockedWord, setNewBlockedWord] = useState('');
  const [savingBlockedWords, setSavingBlockedWords] = useState(false);
  const [regFilter, setRegFilter] = useState('');
  const [supporterForm, setSupporterForm] = useState(EMPTY_SUPPORTER);
  const [editingSupporterId, setEditingSupporterId] = useState<string | null>(null);
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

  useEffect(() => {
    if (sessionStorage.getItem(TOKEN_KEY)) {
      setIsAuthenticated(true);
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
        const { token } = await res.json();
        sessionStorage.setItem(TOKEN_KEY, token);
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
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const fetchDashboardData = async () => {
    try {
      const [resEv, resGal, resComm, resReg, resSup, resStats, resMod] = await Promise.all([
        api('/api/events'),
        api('/api/gallery'),
        api('/api/comments'),
        api('/api/registrations'),
        api('/api/supporters'),
        api('/api/stats'),
        api('/api/moderation'),
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
      }
      if (resEv.ok) setEvents(await resEv.json());
      if (resGal.ok) setGallery(await resGal.json());
      if (resComm.ok) setAllComments(await resComm.json());
    } catch (err) {
      console.warn('Erro ao atualizar dados do painel:', err);
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
      await fetchDashboardData();
      showToast(editing ? 'Apoiador atualizado!' : 'Apoiador cadastrado!');
    } catch {
      showToast('Erro ao salvar apoiador');
    }
  };

  const handleEditSupporter = (s: Supporter) => {
    setEditingSupporterId(s.id || null);
    setSupporterForm({
      name: s.name,
      url: s.url,
      tagline: s.tagline || '',
      role: s.role || 'Apoiador',
      avatar: s.avatar || '',
      is_owner: Boolean(s.is_owner || (s.sort_order ?? 0) < 0),
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

  const eventTitle = (id: string) => events.find((e) => e.id === id)?.title || 'Evento removido';

  const exportRegistrationsCsv = () => {
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Evento', 'Nome', 'Usuario VRChat', 'Observacoes', 'Inscrito em'],
      ...filteredRegistrations.map((r) => [
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
    a.download = 'inscricoes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Criar ou Atualizar Evento
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const editing = editingEventId;
    try {
      const res = await api('/api/events', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...eventForm, id: editing } : eventForm),
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
    setEventForm({
      title: ev.title || '',
      description: ev.description || '',
      date: ev.date || '',
      time: ev.time || '21:30 BRT',
      vrchat_world: ev.vrchat_world || '',
      world_url: ev.world_url || '',
      image_url:
        ev.image_url && ev.image_url !== '/images/banner.jpg' ? ev.image_url : '',
      category: ev.category || 'Encontro Oficial',
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
        {/* Flores e pétalas de Lycoris caindo no fundo da tela de login */}
        <LycorisParticles />

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
      {/* Flores e pétalas de Lycoris caindo no fundo do painel */}
      <LycorisParticles />

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

        {/* Abas de Navegação */}
        <div className="flex border-b border-zinc-800 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-lycoris-500 text-lycoris-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Eventos Futuros ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'gallery'
                ? 'border-lycoris-500 text-lycoris-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Galeria de Fotos ({gallery.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'registrations'
                ? 'border-lycoris-500 text-lycoris-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Inscrições ({registrations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('supporters')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'supporters'
                ? 'border-lycoris-500 text-lycoris-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Apoiadores ({supporters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'stats'
                ? 'border-lycoris-500 text-lycoris-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Destaques do Topo ({heroStats.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'comments'
                ? 'border-lycoris-500 text-lycoris-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Moderação de Mensagens ({allComments.length})</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* ABA 1: EVENTOS */}
        {/* ============================================================== */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 p-6 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-4 h-fit">
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-lycoris-500" />
                {editingEventId ? 'Editar Evento' : 'Novo Evento'}
              </h2>

              <form onSubmit={handleCreateEvent} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Título do Evento</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Noite de Chá Sob as Pétalas"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Horário</label>
                    <input
                      type="text"
                      required
                      value={eventForm.time}
                      onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Mundo no VRChat</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Crimson Moon Shrine"
                    value={eventForm.vrchat_world}
                    onChange={(e) => setEventForm({ ...eventForm, vrchat_world: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Link do Mundo (URL)</label>
                  <input
                    type="url"
                    placeholder="https://vrchat.com/home/world/wrld_..."
                    value={eventForm.world_url}
                    onChange={(e) => setEventForm({ ...eventForm, world_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Categoria / Tag</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                  >
                    <option value="Encontro Oficial">Encontro Oficial</option>
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

                {/* Toggle Efeito Cristal Glass Vermelho (Dona / Destaque) */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-lycoris-950/70 via-zinc-900 to-zinc-950 border border-lycoris-700/50 hover:border-lycoris-500 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={supporterForm.is_owner}
                    onChange={(e) =>
                      setSupporterForm({ ...supporterForm, is_owner: e.target.checked })
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
        {activeTab === 'gallery' && (
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
              <h3 className="font-serif text-lg font-bold text-white">Fotos Publicadas ({gallery.length})</h3>

              {gallery.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center text-zinc-500 text-xs">
                  Nenhuma foto publicada na galeria ainda.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      className="relative group rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
                    >
                      <img src={img.url} alt={img.title} className="w-full h-32 object-cover" />
                      <div className="p-2 space-y-0.5">
                        <div className="font-semibold text-xs text-white truncate">{img.title}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{img.author}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteGallery(img.id)}
                        title="Excluir foto"
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: INSCRIÇÕES */}
        {activeTab === 'registrations' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-white">
                  Inscritos nos Eventos ({filteredRegistrations.length})
                </h2>
                <p className="text-xs text-zinc-400">Nome e usuário do VRChat de quem quer participar.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={regFilter}
                  onChange={(e) => setRegFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                >
                  <option value="">Todos os eventos</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={exportRegistrationsCsv}
                  disabled={filteredRegistrations.length === 0}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              </div>
            </div>

            {filteredRegistrations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">Nenhuma inscrição até o momento.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 font-semibold">Evento</th>
                      <th className="p-3 font-semibold">Nome</th>
                      <th className="p-3 font-semibold">Usuário VRChat</th>
                      <th className="p-3 font-semibold">Observações</th>
                      <th className="p-3 font-semibold">Inscrito em</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((r) => (
                      <tr key={r.id} className="border-b border-zinc-900 last:border-0">
                        <td className="p-3 text-zinc-300">{eventTitle(r.event_id)}</td>
                        <td className="p-3 text-white font-medium">{r.name}</td>
                        <td className="p-3 text-lycoris-400 font-semibold">{r.username}</td>
                        <td className="p-3 text-zinc-400 max-w-[200px] truncate" title={r.notes || ''}>
                          {r.notes || '—'}
                        </td>
                        <td className="p-3 text-zinc-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-3 text-right">
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
        )}

        {/* ABA: APOIADORES */}
        {activeTab === 'supporters' && (
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
                {/* Toggle Efeito Cristal Glass Vermelho (Dona / Destaque) */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-lycoris-950/70 via-zinc-900 to-zinc-950 border border-lycoris-700/50 hover:border-lycoris-500 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={supporterForm.is_owner}
                    onChange={(e) =>
                      setSupporterForm({ ...supporterForm, is_owner: e.target.checked })
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
                          (s.sort_order ?? 0) < 0
                            ? 'bg-lycoris-950/80 border-lycoris-500/50 text-lycoris-300 font-semibold'
                            : 'border-gothic-gold/30 text-gothic-gold'
                        }`}
                      >
                        {s.role}
                      </span>
                      {(s.sort_order ?? 0) < 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-lycoris-600/20 border border-lycoris-500/40 text-lycoris-300 font-semibold">
                          Cristal Carmesim
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
        {activeTab === 'stats' && (
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
        {/* ABA 3: MODERAÇÃO DE COMENTÁRIOS */}
        {/* ============================================================== */}
        {activeTab === 'comments' && (
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
                {/* Toggle Efeito Cristal Glass Vermelho (Dona / Destaque) */}
                <label className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-lycoris-950/70 via-zinc-900 to-zinc-950 border border-lycoris-700/50 hover:border-lycoris-500 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={supporterForm.is_owner}
                    onChange={(e) =>
                      setSupporterForm({ ...supporterForm, is_owner: e.target.checked })
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
                                  <span className="text-[10px] text-zinc-500">
                                    {new Date(comm.created_at).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-200 break-words">{comm.content}</p>
                              </div>

                              <button
                                onClick={() => handleDeleteComment(comm.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
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
      </div>
    </main>
  );
}
