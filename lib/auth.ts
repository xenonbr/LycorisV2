import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { AdminAccessConfig, AdminModuleKey } from '@/lib/types';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
// IMPORTANTE: Configuracoes sensiveis (senhas e RBAC) sao salvas em bucket PRIVADO (public: false)
// nunca no bucket publico 'lycoris-media'.
const PRIVATE_BUCKET_NAME = 'lycoris-private';
const LEGACY_PUBLIC_BUCKET = 'lycoris-media';
const ACCESS_CONFIG_PATH = 'settings/admin-access.json';

export const DEFAULT_LEVEL1_MODULES: Record<AdminModuleKey, boolean> = {
  events: true,
  gallery: true,
  registrations: true,
  supporters: false,
  stats: false,
  sawvr: false,
  submissions: false,
  comments: false,
};

function getEnvLevel1Password(): string {
  return process.env.ADMIN_PASSWORD || 'lyly2026';
}

function getEnvMasterPassword(): string {
  return process.env.MASTER_ADMIN_PASSWORD || 'ra028899';
}

function getSigningSecret(): string {
  const customSecret = process.env.ADMIN_TOKEN_SECRET || '';
  return `${customSecret}::${getEnvMasterPassword()}::${getEnvLevel1Password()}::lycoris-hmac-v2`;
}

let cachedAccessConfig: AdminAccessConfig = {
  level1Password: getEnvLevel1Password(),
  level2Password: getEnvMasterPassword(),
  extraPasswords: [],
  level1Modules: { ...DEFAULT_LEVEL1_MODULES },
};

async function ensurePrivateBucket(): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === PRIVATE_BUCKET_NAME);
    if (!exists) {
      await supabaseAdmin.storage.createBucket(PRIVATE_BUCKET_NAME, {
        public: false,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['application/json'],
      });
    } else {
      await supabaseAdmin.storage.updateBucket(PRIVATE_BUCKET_NAME, {
        public: false,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['application/json'],
      });
    }
  } catch {
    // Ignora erro se ja existir
  }
}

export async function getAdminAccessConfig(): Promise<AdminAccessConfig> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await ensurePrivateBucket();
      let { data, error } = await supabaseAdmin.storage
        .from(PRIVATE_BUCKET_NAME)
        .download(ACCESS_CONFIG_PATH);

      // Migração transparente e remoção imediata caso ainda exista no bucket público antigo
      if (error || !data) {
        const legacy = await supabaseAdmin.storage
          .from(LEGACY_PUBLIC_BUCKET)
          .download(ACCESS_CONFIG_PATH);
        if (!legacy.error && legacy.data) {
          data = legacy.data;
          const rawText = await legacy.data.text();
          await supabaseAdmin.storage
            .from(PRIVATE_BUCKET_NAME)
            .upload(ACCESS_CONFIG_PATH, Buffer.from(rawText, 'utf-8'), {
              contentType: 'application/json',
              cacheControl: '0',
              upsert: true,
            });
          await supabaseAdmin.storage
            .from(LEGACY_PUBLIC_BUCKET)
            .remove([ACCESS_CONFIG_PATH]);
          data = new Blob([rawText], { type: 'application/json' });
        }
      }

      if (data) {
        const parsed = JSON.parse(await data.text());
        if (parsed && typeof parsed === 'object') {
          cachedAccessConfig = {
            level1Password:
              String(parsed.level1Password || '').trim() || getEnvLevel1Password(),
            level2Password:
              String(parsed.level2Password || '').trim() || getEnvMasterPassword(),
            extraPasswords: Array.isArray(parsed.extraPasswords)
              ? parsed.extraPasswords
              : [],
            level1Modules: {
              ...DEFAULT_LEVEL1_MODULES,
              ...(parsed.level1Modules || {}),
            },
          };
          return cachedAccessConfig;
        }
      }
    } catch {
      // Usa configuracao padrao se o arquivo ainda nao existir
    }
  }
  return cachedAccessConfig;
}

export async function saveAdminAccessConfig(
  nextConfig: AdminAccessConfig
): Promise<AdminAccessConfig> {
  const sanitized: AdminAccessConfig = {
    level1Password:
      String(nextConfig.level1Password || '').trim() || getEnvLevel1Password(),
    level2Password:
      String(nextConfig.level2Password || '').trim() || getEnvMasterPassword(),
    extraPasswords: Array.isArray(nextConfig.extraPasswords)
      ? nextConfig.extraPasswords
      : [],
    level1Modules: {
      ...DEFAULT_LEVEL1_MODULES,
      ...(nextConfig.level1Modules || {}),
    },
  };

  cachedAccessConfig = sanitized;

  if (isSupabaseConfigured && supabaseAdmin) {
    await ensurePrivateBucket();
    const buffer = Buffer.from(JSON.stringify(sanitized, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(PRIVATE_BUCKET_NAME)
      .upload(ACCESS_CONFIG_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
    // Garante que nunca sobre cópia no bucket público
    await supabaseAdmin.storage
      .from(LEGACY_PUBLIC_BUCKET)
      .remove([ACCESS_CONFIG_PATH])
      .catch(() => {});
  }

  return sanitized;
}

function sign(payload: string, secret = getSigningSecret()): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Rate limiter em memória por IP + rota para mitigar Brute-Force, DoS e Spam
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown-ip';
}

export function checkRateLimit(
  request: Request,
  bucketKey: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${bucketKey}:${ip}`;

  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt <= now) rateLimitStore.delete(k);
    }
  }

  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (current.count >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  current.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function tooManyRequests(retryAfterSec = 60) {
  return new Response(
    JSON.stringify({
      error: `Muitas tentativas consecutivas. Aguarde ${retryAfterSec}s antes de tentar novamente.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}

// Verifica uma senha contra a configuração salva no bucket privado
export async function verifyAdminCredentials(password: string): Promise<{
  authenticated: boolean;
  isMaster: boolean;
  label?: string;
  level1Modules: Record<AdminModuleKey, boolean>;
}> {
  const config = await getAdminAccessConfig();
  const input = typeof password === 'string' ? password : '';

  if (!input) {
    return {
      authenticated: false,
      isMaster: false,
      level1Modules: config.level1Modules,
    };
  }

  if (safeEqual(input, config.level2Password)) {
    return {
      authenticated: true,
      isMaster: true,
      label: 'Administrador Principal (Nível 2)',
      level1Modules: config.level1Modules,
    };
  }

  if (safeEqual(input, config.level1Password)) {
    return {
      authenticated: true,
      isMaster: false,
      label: 'Administrador Nível 1',
      level1Modules: config.level1Modules,
    };
  }

  for (const extra of config.extraPasswords) {
    if (extra.password && safeEqual(input, extra.password)) {
      return {
        authenticated: true,
        isMaster: extra.level === 2,
        label: extra.label || `Acesso Extra (Nível ${extra.level})`,
        level1Modules: config.level1Modules,
      };
    }
  }

  return {
    authenticated: false,
    isMaster: false,
    level1Modules: config.level1Modules,
  };
}

export function createAdminToken(): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function createMasterToken(): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const payload = `master:${exp}`;
  return `${exp}.${sign(payload)}`;
}

export function isAdminRequest(request: Request): boolean {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const legacySecret = `${getEnvMasterPassword()}::${getEnvLevel1Password()}::lycoris-hmac`;
  if (
    !safeEqual(sig, sign(exp)) &&
    !safeEqual(sig, sign(exp, legacySecret)) &&
    !safeEqual(sig, sign(exp, getEnvLevel1Password()))
  ) {
    return false;
  }
  return Number(exp) > Date.now();
}

export function isMasterAdminRequest(request: Request): boolean {
  if (!isAdminRequest(request)) return false;
  const masterToken = request.headers.get('x-master-token') || '';
  const [exp, sig] = masterToken.split('.');
  if (!exp || !sig) return false;
  const payload = `master:${exp}`;
  const legacySecret = `${getEnvMasterPassword()}::${getEnvLevel1Password()}::lycoris-hmac`;
  if (
    !safeEqual(sig, sign(payload)) &&
    !safeEqual(sig, sign(payload, legacySecret)) &&
    !safeEqual(sig, sign(payload, getEnvMasterPassword()))
  ) {
    return false;
  }
  return Number(exp) > Date.now();
}

export async function canAccessAdminModule(
  request: Request,
  moduleKey: AdminModuleKey
): Promise<boolean> {
  if (!isAdminRequest(request)) return false;
  if (isMasterAdminRequest(request)) return true;
  const config = await getAdminAccessConfig();
  return Boolean(config.level1Modules[moduleKey]);
}

export function isWebhookRequest(request: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqual(request.headers.get('x-webhook-secret') || '', secret);
}

export function unauthorized(msg = 'Não autorizado') {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function forbiddenMaster() {
  return new Response(
    JSON.stringify({ error: 'Acesso restrito ou módulo desativado para o seu nível.' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ============================================================================
// IDENTIDADE DE COMENTÁRIOS POR IP + COOKIE ASSINADO (PREVENÇÃO DE FALSIFICAÇÃO)
// ============================================================================

export function computeIpHash(ip: string): string {
  return createHmac('sha256', `${getSigningSecret()}::ip-identity`)
    .update(String(ip || 'unknown-ip').trim())
    .digest('hex')
    .slice(0, 24);
}

export function computeIpTag(ipHash: string): string {
  return `#${String(ipHash || '000000').slice(0, 6).toUpperCase()}`;
}

export function createSignedNickCookieValue(authorName: string): string {
  const clean = String(authorName || '').trim();
  const b64 = Buffer.from(clean, 'utf-8').toString('base64url');
  const sig = sign(`nick:${b64}`);
  return `${b64}.${sig}`;
}

export function verifySignedNickCookieValue(cookieVal?: string | null): string | null {
  if (!cookieVal) return null;
  const [b64, sig] = String(cookieVal).split('.');
  if (!b64 || !sig) return null;
  if (!safeEqual(sig, sign(`nick:${b64}`))) return null;
  try {
    const decoded = Buffer.from(b64, 'base64url').toString('utf-8').trim();
    return decoded || null;
  } catch {
    return null;
  }
}

export function parseCookieHeader(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

