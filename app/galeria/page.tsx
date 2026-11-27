"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GallerySection from '@/components/GallerySection';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  X,
} from 'lucide-react';

const ALLOWED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_PHOTO_EXT = /\.(jpe?g|png|webp|gif)$/i;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Comprime e valida que o arquivo pode ser decodificado como imagem real no navegador
async function compressAndValidatePhoto(
  file: File,
  maxDim = 1920,
  quality = 0.82
): Promise<{ compressed: File; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width < 20 || height < 20) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error('As dimensões da imagem são inválidas.'));
      }

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
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error('Não foi possível processar a imagem.'));
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            return reject(new Error('Falha ao preparar a foto para envio.'));
          }
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'lycoris-photo';
          const compressed = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
          });
          const previewUrl = URL.createObjectURL(blob);
          resolve({ compressed, previewUrl });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Arquivo bloqueado: o arquivo selecionado não é uma foto válida.'
        )
      );
    };

    img.src = objectUrl;
  });
}

export default function GaleriaPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [vrchatWorld, setVrchatWorld] = useState('Lycoris Garden Sanctuary');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePhotoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Trava imediata por tipo MIME e extensão (somente arquivos de foto)
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_PHOTO_TYPES.has(mime) || !ALLOWED_PHOTO_EXT.test(file.name)) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressionStats(null);
      setErrorMsg(
        'Tipo de arquivo bloqueado! Apenas arquivos do tipo foto (.JPG, .PNG, .WEBP ou .GIF) são aceitos.'
      );
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressionStats(null);
      setErrorMsg('A imagem escolhida é muito grande (máximo 15MB).');
      return;
    }

    setProcessingFile(true);
    try {
      const originalSize = file.size;
      const { compressed, previewUrl: nextPreview } =
        await compressAndValidatePhoto(file, 1920, 0.82);

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const savedPct = Math.max(
        0,
        Math.round((1 - compressed.size / originalSize) * 100)
      );

      setSelectedFile(compressed);
      setPreviewUrl(nextPreview);
      if (!title.trim()) {
        setTitle(
          file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]/g, ' ')
            .slice(0, 70)
        );
      }
      setCompressionStats(
        `Foto verificada e otimizada: ${formatBytes(originalSize)} → ${formatBytes(
          compressed.size
        )} (WebP, -${savedPct}%)`
      );
    } catch (err: any) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressionStats(null);
      setErrorMsg(
        err.message ||
          'Arquivo inválido. Selecione apenas arquivos reais de fotografia.'
      );
    } finally {
      setProcessingFile(false);
    }
  };

  const handleSubmitCommunityPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile) {
      setErrorMsg('Escolha um arquivo de foto do seu dispositivo para enviar.');
      return;
    }

    if (!title.trim() || !author.trim()) {
      setErrorMsg('Preencha o título do registro e seu nome/nick no VRChat.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('author', author.trim());
      formData.append(
        'vrchat_world',
        vrchatWorld.trim() || 'Lycoris Garden Sanctuary'
      );

      const res = await fetch('/api/gallery/submissions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao enviar sua foto para avaliação.');
        return;
      }

      setSuccessMsg(
        'Sua foto foi enviada com sucesso! Ela foi encaminhada para análise de um Administrador e aparecerá na galeria assim que for aprovada.'
      );
      setTitle('');
      setAuthor('');
      setVrchatWorld('Lycoris Garden Sanctuary');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCompressionStats(null);
      setIsUploadOpen(false);
    } catch {
      setErrorMsg('Erro de conexão ao enviar sua foto. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col bg-gothic-bg text-zinc-100">
      <Navbar />

      {/* Cabeçalho da Página Dedicada da Galeria */}
      <section className="relative pt-28 sm:pt-36 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10">
        <div
          style={{ '--reveal-delay': '180ms' } as React.CSSProperties}
          className="lycoris-reveal-step mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-lycoris-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a Página Inicial</span>
          </Link>
        </div>

        <div
          style={{ '--reveal-delay': '340ms' } as React.CSSProperties}
          className="lycoris-reveal-step text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lycoris-950/70 border border-lycoris-800/50 text-lycoris-400 text-xs font-semibold uppercase tracking-widest">
            <Camera className="w-3.5 h-3.5 text-lycoris-500" />
            Acervo Fotográfico • Lycoris Garden
          </div>
          <h1 className="font-serif text-3xl sm:text-6xl font-black text-white tracking-tight">
            Galeria <span className="text-lycoris-500">Comunitária</span>
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-14 bg-gradient-to-r from-transparent to-lycoris-600" />
            <div className="w-2 h-2 rotate-45 bg-lycoris-500 shadow-lycoris-glow" />
            <div className="h-[1px] w-14 bg-gradient-to-l from-transparent to-lycoris-600" />
          </div>
          <p className="font-sans text-zinc-400 text-sm sm:text-base leading-relaxed">
            Explore todas as memórias registradas em nossas instâncias no VRChat ou envie sua própria captura para fazer parte do mural oficial da comunidade.
          </p>
        </div>
      </section>

      {/* Seção: Botão Clean "Postar foto" que abre o painel de upload ao clicar */}
      <section
        id="enviar-foto"
        style={{ '--reveal-delay': '480ms' } as React.CSSProperties}
        className="lycoris-reveal-step relative py-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full z-10"
      >
        {!isUploadOpen ? (
          <div className="lycoris-tab-panel flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setSuccessMsg(null);
                setIsUploadOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-lycoris-glow hover:shadow-lycoris-glow-lg transition-all duration-300 hover:-translate-y-0.5 border border-lycoris-400/40"
            >
              <Upload className="w-4 h-4 text-lycoris-200" />
              <span>Postar foto</span>
            </button>

            {successMsg && (
              <div className="max-w-xl w-full p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-center justify-center gap-2 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="lycoris-expand-panel relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-zinc-950/90 via-zinc-900/85 to-zinc-950/95 border border-lycoris-800/50 p-6 sm:p-8 shadow-lycoris-glow backdrop-blur-md">
            <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 bg-lycoris-600/15 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lycoris-400/70 to-transparent" />

            <div className="relative z-10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-lycoris-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Posts da Comunidade
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    Compartilhe um Registro na Galeria
                  </h2>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-lycoris-400 shrink-0" />
                    <span>Publicação mediante aprovação da Administração</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    title="Fechar formulário de postagem"
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitCommunityPost} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Coluna Esquerda: Upload Travado Somente para Fotos */}
                  <div className="md:col-span-5 space-y-2">
                    <label className="block text-xs text-zinc-300 font-semibold">
                      Arquivo da Foto (Somente Imagens)
                    </label>

                    <label className="relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-lycoris-700/60 hover:border-lycoris-500 bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer transition-all text-center min-h-[168px] overflow-hidden">
                      {previewUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={previewUrl}
                            alt="Prévia da foto selecionada"
                            className="absolute inset-0 w-full h-full object-cover opacity-45"
                          />
                          <div className="relative z-10 px-3 py-1.5 rounded-full bg-black/80 border border-lycoris-500/60 text-xs font-semibold text-white">
                            Trocar foto selecionada
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-lycoris-400" />
                          <span className="text-xs font-semibold text-zinc-200">
                            {processingFile
                              ? 'Verificando e otimizando foto...'
                              : 'Clique para escolher uma foto'}
                          </span>
                          <span className="text-[11px] text-zinc-400 leading-snug">
                            Exclusivamente fotos (.JPG, .PNG, .WEBP ou .GIF) • Outros arquivos são bloqueados
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                        disabled={processingFile || submitting}
                        onChange={handlePhotoFileChange}
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

                  {/* Coluna Direita: Dados do Registro */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-3.5">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">
                        Título do Registro
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        placeholder="Ex: Encontro Noturno sob as Pétalas"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Autor / Fotógrafo (Nick no VRChat)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={50}
                          placeholder="Seu nick no VRChat"
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">
                          Mundo VRChat
                        </label>
                        <input
                          type="text"
                          maxLength={80}
                          placeholder="Nome da instância ou mundo"
                          value={vrchatWorld}
                          onChange={(e) => setVrchatWorld(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-lycoris-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="submit"
                        disabled={submitting || processingFile || !selectedFile}
                        className="flex-1 py-3 rounded-xl bg-lycoris-600 hover:bg-lycoris-500 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold shadow-lycoris-glow transition-all flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {submitting
                            ? 'Enviando para análise da Administração...'
                            : 'Enviar Foto para Aprovação'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsUploadOpen(false)}
                        className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold transition-colors"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Grade Completa de Fotos da Galeria */}
      <GallerySection limit={0} showHeader={false} showViewAllButton={false} />

      <Footer />
    </main>
  );
}
