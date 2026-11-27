"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Camera, MessageSquare, Heart, X, Send, User, ArrowRight, Upload, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { GalleryImage, CommentItem } from '@/lib/types';
import {
  MAX_COMMENT_LENGTH,
  MAX_AUTHOR_LENGTH,
  stripForbiddenChars,
  validateCommentInput,
} from '@/lib/moderation';

export default function GallerySection({
  limit = 6,
  showHeader = true,
  showViewAllButton = true,
}: {
  limit?: number;
  showHeader?: boolean;
  showViewAllButton?: boolean;
}) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<GalleryImage | null>(null);
  const [isFullscreenPhoto, setIsFullscreenPhoto] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [lockedAuthorName, setLockedAuthorName] = useState<string | null>(null);
  const [isIpBlocked, setIsIpBlocked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Carrega do navegador quais fotos este visitante já curtiu
    try {
      const savedLikes = localStorage.getItem('lycoris_liked_photos');
      if (savedLikes) {
        setLikedMap(JSON.parse(savedLikes));
      }
    } catch (err) {
      console.warn('Erro ao ler curtidas do localStorage:', err);
    }

    async function loadGallery() {
      try {
        setLoading(true);
        const res = await fetch('/api/gallery', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setImages(data);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar galeria:', err);
      } finally {
        setLoading(false);
      }
    }
    async function loadIdentity() {
      try {
        const res = await fetch('/api/comments?myIdentity=true', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.lockedName) {
            setLockedAuthorName(data.lockedName);
            setAuthorName(data.lockedName);
          }
          if (data?.blocked) {
            setIsIpBlocked(true);
          }
        }
      } catch {
        // ignora erro de rede
      }
    }

    loadGallery();
    loadIdentity();
  }, []);

  const openLightbox = async (img: GalleryImage) => {
    setActiveImage(img);
    setComments(img.comments || []);

    try {
      const res = await fetch('/api/comments?imageId=' + img.id, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setComments(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar comentários:', err);
    }
  };

  const closeLightbox = () => {
    setActiveImage(null);
    setIsFullscreenPhoto(false);
    setNewComment('');
    setCommentError('');
  };

  // Trava o scroll da página de fundo e fecha com ESC quando uma foto está aberta
  useEffect(() => {
    if (!activeImage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        if (isFullscreenPhoto) {
          setIsFullscreenPhoto(false);
        } else {
          closeLightbox();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImage, isFullscreenPhoto]);

  // Gerenciamento de curtidas com sincronização no Supabase e no localStorage
  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isCurrentlyLiked = Boolean(likedMap[id]);
    const willBeLiked = !isCurrentlyLiked;

    // 1. Grava no navegador do usuário
    const newLikedMap = { ...likedMap, [id]: willBeLiked };
    setLikedMap(newLikedMap);
    try {
      localStorage.setItem('lycoris_liked_photos', JSON.stringify(newLikedMap));
    } catch (err) {
      console.warn('Erro ao salvar no localStorage:', err);
    }

    // 2. Atualiza a tela instantaneamente
    setImages((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, likes: Math.max(0, item.likes + (willBeLiked ? 1 : -1)) }
          : item
      )
    );

    if (activeImage && activeImage.id === id) {
      setActiveImage((prev) =>
        prev ? { ...prev, likes: Math.max(0, prev.likes + (willBeLiked ? 1 : -1)) } : null
      );
    }

    // 3. Salva a nova contagem no banco de dados Supabase
    try {
      const res = await fetch('/api/gallery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: willBeLiked ? 'like' : 'unlike',
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result && typeof result.likes === 'number') {
          setImages((current) =>
            current.map((item) => (item.id === id ? { ...item, likes: result.likes } : item))
          );
        }
      }
    } catch (err) {
      console.error('Falha ao sincronizar curtida com o servidor:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeImage) return;
    setCommentError('');

    const check = validateCommentInput(authorName, newComment);
    if (!check.valid) {
      setCommentError(check.error || 'Comentário inválido.');
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: activeImage.id,
          author_name: authorName.trim(),
          content: newComment.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.lockedName) {
          setLockedAuthorName(data.lockedName);
          setAuthorName(data.lockedName);
        }
        setCommentError(data.error || 'Não foi possível enviar o comentário.');
        return;
      }
      if (data.lockedName) {
        setLockedAuthorName(data.lockedName);
        setAuthorName(data.lockedName);
      }
      setComments((prev) => [data, ...prev]);
      setImages((prev) =>
        prev.map((img) =>
          img.id === activeImage.id
            ? { ...img, comments: [data, ...(img.comments || [])] }
            : img
        )
      );
      setNewComment('');
    } catch (err) {
      console.error('Falha ao persistir comentário:', err);
      setCommentError('Erro de conexão ao enviar comentário.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const displayedImages = typeof limit === 'number' && limit > 0 ? images.slice(0, limit) : images;

  return (
    <section id="galeria" className="relative py-16 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
      {showHeader && (
        <div className="text-center space-y-4 mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lycoris-950/70 border border-lycoris-800/40 text-lycoris-400 text-xs font-semibold uppercase tracking-widest">
            <Camera className="w-3.5 h-3.5 text-lycoris-500" />
            Registros e Memórias
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Galeria <span className="text-lycoris-500">Comunitária</span>
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-lycoris-600" />
            <div className="w-2 h-2 rotate-45 bg-lycoris-500 shadow-lycoris-glow" />
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-lycoris-600" />
          </div>
          <p className="font-sans text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Momentos capturados por nossos fotógrafos e membros. Clique em qualquer imagem para abrir em alta resolução e deixar sua mensagem.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-xs text-zinc-500 animate-pulse">
          Carregando memórias do santuário...
        </div>
      ) : displayedImages.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 max-w-lg mx-auto backdrop-blur-sm">
          <Camera className="w-10 h-10 text-lycoris-500/60 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-white">Nenhuma foto publicada no momento</h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            As capturas adicionadas pelo painel administrativo ou enviadas pela comunidade aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {displayedImages.map((img) => (
            <div
              key={img.id}
              onClick={() => openLightbox(img)}
              className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-lycoris-600/70 transition-all duration-300 hover:shadow-lycoris-glow hover:-translate-y-1"
            >
              <div className="relative w-full aspect-[4/3] sm:aspect-auto">
                <img
                  src={img.url}
                  alt="Registro fotográfico Lycoris Garden"
                  className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 p-4 sm:p-5 flex flex-col justify-end">
                <span className="text-xs text-lycoris-400 font-medium">
                  {img.vrchat_world || 'Lycoris Garden Sanctuary'}
                </span>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Por <span className="font-semibold text-zinc-100">{img.author}</span>
                </p>

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-700/50">
                  <button
                    onClick={(e) => handleLike(img.id, e)}
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-lycoris-400 transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        likedMap[img.id] ? 'fill-lycoris-500 text-lycoris-500' : 'text-zinc-400'
                      }`}
                    />
                    <span>{img.likes}</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <MessageSquare className="w-4 h-4 text-zinc-400" />
                    <span>{(img.comments && img.comments.length) || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showViewAllButton && (
        <div className="mt-10 sm:mt-14 flex items-center justify-center">
          <Link
            href="/galeria"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 text-white font-semibold text-xs sm:text-sm shadow-lycoris-glow hover:shadow-lycoris-glow-lg transition-all duration-300 hover:-translate-y-0.5 border border-lycoris-400/40"
          >
            <Camera className="w-4 h-4 text-lycoris-200" />
            <span>
              Ver Galeria Completa{images.length > 6 ? ` (${images.length} fotos)` : ''}
            </span>
            <ArrowRight className="w-4 h-4 text-lycoris-200" />
          </Link>
        </div>
      )}

      {activeImage &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-6 overscroll-contain"
            onClick={closeLightbox}
          >
            <div
              className="relative max-w-6xl w-full max-h-[94dvh] sm:max-h-[92vh] lg:h-[86vh] bg-gothic-card rounded-t-2xl sm:rounded-2xl border-t sm:border border-lycoris-900/50 shadow-2xl overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeLightbox}
                className="fixed sm:absolute top-3 right-3 z-30 p-2.5 rounded-full bg-black/80 hover:bg-lycoris-700 text-zinc-200 hover:text-white transition-colors border border-zinc-700"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div
                onClick={() => setIsFullscreenPhoto(true)}
                title="Clique na foto para ver em tela cheia"
                className="group/photo lg:w-7/12 bg-black flex items-center justify-center p-3 sm:p-6 relative min-h-[220px] sm:min-h-[260px] lg:h-full shrink-0 cursor-zoom-in"
              >
                <img
                  src={activeImage.url}
                  alt={activeImage.title || 'Registro em tela cheia'}
                  className="max-h-[48dvh] sm:max-h-[75vh] lg:max-h-full w-auto max-w-full object-contain rounded-lg shadow-lg transition-transform duration-300 group-hover/photo:scale-[1.01]"
                />
                <span className="pointer-events-none absolute bottom-3 right-3 px-2.5 py-1.5 rounded-full bg-black/75 border border-zinc-700/80 text-[11px] font-medium text-zinc-200 inline-flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover/photo:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5 text-lycoris-400" />
                  <span>Ver em tela cheia</span>
                </span>
              </div>

              <div className="lg:w-5/12 p-5 sm:p-6 flex flex-col justify-between bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800/80 lg:h-full overflow-hidden">
                <div className="flex flex-col min-h-0 flex-1">
                  <div className="space-y-1.5 pb-4 pr-10 border-b border-zinc-800 shrink-0">
                    <span className="text-[11px] uppercase tracking-wider text-lycoris-400 font-semibold block">
                      {activeImage.vrchat_world || 'Lycoris Garden Sanctuary'}
                    </span>
                    {activeImage.title && (
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                        {activeImage.title}
                      </h3>
                    )}
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-lycoris-500" />
                        Capturada por <strong className="text-zinc-200">{activeImage.author}</strong>
                      </span>
                      <button
                        onClick={(e) => handleLike(activeImage.id, e)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-lycoris-600/50 text-xs text-zinc-300 transition-colors"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-colors ${
                            likedMap[activeImage.id] ? 'fill-lycoris-500 text-lycoris-500' : 'text-zinc-400'
                          }`}
                        />
                        <span>{activeImage.likes} curtidas</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col min-h-0 flex-1">
                    <h4 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-3 shrink-0">
                      <MessageSquare className="w-4 h-4 text-lycoris-500" />
                      Comentários ({comments.length})
                    </h4>

                    <div className="space-y-3 overflow-y-auto overscroll-contain pr-1.5 flex-1 min-h-[140px] max-h-[38vh] lg:max-h-none">
                      {comments.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-4 text-center">
                          Nenhum comentário ainda. Deixe sua mensagem nesta memória!
                        </p>
                      ) : (
                        comments.map((comm) => (
                          <div
                            key={comm.id}
                            className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-lycoris-300">{comm.author_name}</span>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(comm.created_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-zinc-300 leading-relaxed font-sans break-words">{comm.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddComment} className="pt-4 mt-4 border-t border-zinc-800/80 space-y-2.5 shrink-0">
                  {commentError && (
                    <div className="px-3 py-2 rounded-lg bg-red-950/70 border border-red-800/80 text-[11px] text-red-200">
                      {commentError}
                    </div>
                  )}
                  <div className="space-y-2">
                    {lockedAuthorName ? (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/90 border border-lycoris-800/60 text-xs">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Lock className="w-3.5 h-3.5 text-lycoris-400 shrink-0" />
                          <span>Comentando como:</span>
                          <strong className="text-lycoris-300 font-semibold">{lockedAuthorName}</strong>
                        </span>
                        <span className="text-[10px] text-zinc-500">Nome permanente vinculado</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          required
                          disabled={isIpBlocked}
                          maxLength={MAX_AUTHOR_LENGTH}
                          placeholder="Seu nome ou Nick no VRChat..."
                          value={authorName}
                          onChange={(e) => {
                            setCommentError('');
                            setAuthorName(stripForbiddenChars(e.target.value, true));
                          }}
                          className="w-full px-3 py-2.5 text-base sm:text-xs rounded-lg bg-zinc-900 border border-zinc-800 focus:border-lycoris-500 text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50"
                        />
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/50 border border-amber-700/40 text-[11px] text-amber-200/95">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            <strong>Atenção:</strong> escolha com cuidado! Este nome será <strong>permanente</strong> e ficará vinculado ao seu IP/dispositivo.
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <textarea
                        required
                        disabled={isIpBlocked}
                        rows={2}
                        maxLength={MAX_COMMENT_LENGTH}
                        placeholder={
                          isIpBlocked
                            ? 'Seu acesso aos comentários foi suspenso pela moderação.'
                            : 'Deixe uma mensagem com emojis 😊 (máx. 150 caracteres)...'
                        }
                        value={newComment}
                        onChange={(e) => {
                          setCommentError('');
                          setNewComment(stripForbiddenChars(e.target.value, false));
                        }}
                        className="w-full px-3 py-2.5 text-base sm:text-xs rounded-lg bg-zinc-900 border border-zinc-800 focus:border-lycoris-500 text-white placeholder-zinc-500 focus:outline-none resize-none pr-10 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={isIpBlocked || submittingComment || !authorName.trim() || !newComment.trim()}
                        className="absolute right-2 bottom-3 p-1.5 rounded-md bg-lycoris-600 hover:bg-lycoris-500 disabled:opacity-40 text-white transition-colors"
                        title="Enviar comentário"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 px-0.5">
                      <span>Emojis liberados ✨ • Sem links</span>
                      <span className={newComment.length >= MAX_COMMENT_LENGTH ? 'text-lycoris-400 font-semibold' : ''}>
                        {newComment.length}/{MAX_COMMENT_LENGTH}
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Visualizador 100% Tela Cheia ao clicar na foto */}
            {isFullscreenPhoto && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFullscreenPhoto(false);
                }}
                className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-6 cursor-zoom-out"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreenPhoto(false);
                  }}
                  className="fixed top-4 right-4 z-[130] px-3.5 py-2 rounded-full bg-zinc-900/90 hover:bg-lycoris-700 text-zinc-100 hover:text-white border border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xl transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Sair da Tela Cheia</span>
                </button>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeImage.url}
                  alt={activeImage.title || 'Foto em tela cheia'}
                  className="max-w-[98vw] max-h-[95dvh] w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
                />
              </div>
            )}
          </div>,
          document.body
        )}
    </section>
  );
}
