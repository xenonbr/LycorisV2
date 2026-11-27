import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { AdminAccessConfig, AdminAccount, AdminModuleKey } from '@/lib/types';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
// IMPORTANTE: Configuracoes sensiveis (senhas e permissoes) ficam em bucket PRIVADO (public: false),
// nunca no bucket publico 'lycoris-media'.
const PRIVATE_BUCKET_NAME = 'lycoris-private';
const LEGACY_PUBLIC_BUCKET = 'lycoris-media';
const ACCESS_CONFIG_PATH = 'settings/admin-access.json';
const CONFIG_CACHE_TTL_MS = 3000;

export const ALL_MODULE_KEYS: AdminModuleKey[] = [
  'events',
  'gallery',
  'registrations',
  'supporters',
  'stats',
  'sawvr',
  'submissions',
  'comments',
  'users',
];

export function buildModules(
  source?: Partial<Record<AdminModuleKey, unknown>> | null,
  fallback = false
): Record<AdminModuleKey, boolean> {
  const out = {} as Record<AdminModuleKey, boolean>;
  for (const key of ALL_MODULE_KEYS) {
    const v = source ? source[key] : undefined;
    out[key] = v === undefined ? fallback : Boolean(v);
  }
  return out;
}

export const DEFAULT_ACCOUNT_MODULES: Record<AdminModuleKey, boolean> = {
  ...buildModules(null, false),
  events: true,
  gallery: true,
  registrations: true,
};

function getEnvMasterPassword(): string {
  return process.env.MASTER_ADMIN_PASSWORD || 'ra028899';
}

function getSigningSecret(): string {
  const customSecret = process.env.ADMIN_TOKEN_SECRET || '';
  return `${customSecret}::${getEnvMasterPassword()}::lycoris-hmac-v3`;
}

let cachedAccessConfig: AdminAccessConfig = {
  level2Password: getEnvMasterPassword(),
  accounts: [],
};
let cacheLoadedAt = 0;
let privateBucketReady = false;

async function ensurePrivateBucket(): Promise<void> {
  if (privateBucketReady || !isSupabaseConfigured || !supabaseAdmin) return;
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === PRIVATE_BUCKET_NAME);
    const opts = {
      public: false,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: ['application/json'],
    };
    if (!exists) {
      await supabaseAdmin.storage.createBucket(PRIVATE_BUCKET_NAME, opts);
    } else {
      await supabaseAdmin.storage.updateBucket(PRIVATE_BUCKET_NAME, opts);
    }
    privateBucketReady = true;
  } catch {
    // Ignora erro se ja existir
  }
}

function normalizeAccount(raw: any): AdminAccount | null {
  const password = String(raw?.password || '').trim();
  if (password.length < 3) return null;
  return {
    id: String(raw?.id || crypto.randomUUID()),
    label: String(raw?.label || 'Acesso').trim().slice(0, 60) || 'Acesso',
    password,
    modules: buildModules(raw?.modules, false),
    created_at: raw?.created_at || new Date().toISOString(),
  };
}

// Converte o formato antigo (senha nível 1 global + extras) para contas individuais
function migrateLegacyConfig(parsed: any): AdminAccount[] {
  const legacyModules = buildModules(parsed?.level1Modules, false);
  const extras: any[] = Array.isArray(parsed?.extraPasswords) ? parsed.extraPasswords : [];
  const accounts: AdminAccount[] = [];
  for (const extra of extras) {
    const acc = normalizeAccount({
      id: extra?.id,
      label: extra?.label,
      password: extra?.password,
      created_at: extra?.created_at,
      modules: Number(extra?.level) === 2 ? buildModules(null, true) : legacyModules,
    });
    if (acc) accounts.push(acc);
  }
  return accounts;
}

export async function getAdminAccessConfig(): Promise<AdminAccessConfig> {
  if (isSupabaseConfigured && supabaseAdmin) {
    if (Date.now() - cacheLoadedAt < CONFIG_CACHE_TTL_MS) return cachedAccessConfig;
    try {
      await ensurePrivateBucket();
      let { data, error } = await supabaseAdmin.storage
        .from(PRIVATE_BUCKET_NAME)
        .download(ACCESS_CONFIG_PATH);

      // Migracao transparente caso ainda exista no bucket publico antigo
      if (error || !data) {
        const legacy = await supabaseAdmin.storage
          .from(LEGACY_PUBLIC_BUCKET)
          .download(ACCESS_CONFIG_PATH);
        if (!legacy.error && legacy.data) {
          const rawText = await legacy.data.text();
          await supabaseAdmin.storage
            .from(PRIVATE_BUCKET_NAME)
            .upload(ACCESS_CONFIG_PATH, Buffer.from(rawText, 'utf-8'), {
              contentType: 'application/json',
              cacheControl: '0',
              upsert: true,
            });
          await supabaseAdmin.storage.from(LEGACY_PUBLIC_BUCKET).remove([ACCESS_CONFIG_PATH]);
          data = new Blob([rawText], { type: 'application/json' }) as any;
        }
      }

      if (data) {
        const parsed = JSON.parse(await data.text());
        if (parsed && typeof parsed === 'object') {
          const accounts: AdminAccount[] = Array.isArray(parsed.accounts)
            ? (parsed.accounts.map(normalizeAccount).filter(Boolean) as AdminAccount[])
            : migrateLegacyConfig(parsed);

          cachedAccessConfig = {
            level2Password:
              String(parsed.level2Password || '').trim() || getEnvMasterPassword(),
            accounts,
          };
          cacheLoadedAt = Date.now();
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
  next: AdminAccessConfig
): Promise<AdminAccessConfig> {
  const sanitized: AdminAccessConfig = {
    level2Password: String(next.level2Password || '').trim() || getEnvMasterPassword(),
    accounts: (Array.isArray(next.accounts) ? next.accounts : [])
      .map(normalizeAccount)
      .filter(Boolean) as AdminAccount[],
  };

  cachedAccessConfig = sanitized;
  cacheLoadedAt = Date.now();

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

// ============================================================================
// RATE LIMIT EM MEMÓRIA (por IP + rota) contra brute-force, flood e DoS
// ============================================================================
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

// ============================================================================
// LOGIN: senha mestra (acesso total) OU senha de uma conta individual
// ============================================================================
export async function verifyAdminCredentials(password: string): Promise<{
  authenticated: boolean;
  isMaster: boolean;
  accountId: string;
  label?: string;
  modules: Record<AdminModuleKey, boolean>;
}> {
  const config = await getAdminAccessConfig();
  const input = typeof password === 'string' ? password : '';
  const none = buildModules(null, false);

  if (!input) {
    return { authenticated: false, isMaster: false, accountId: '', modules: none };
  }

  if (safeEqual(input, config.level2Password)) {
    return {
      authenticated: true,
      isMaster: true,
      accountId: 'master',
      label: 'Administrador Principal',
      modules: buildModules(null, true),
    };
  }

  for (const acc of config.accounts) {
    if (acc.password && safeEqual(input, acc.password)) {
      return {
        authenticated: true,
        isMaster: false,
        accountId: acc.id,
        label: acc.label,
        modules: acc.modules,
      };
    }
  }

  return { authenticated: false, isMaster: false, accountId: '', modules: none };
}

// ============================================================================
// TOKENS: o token carrega o ID da conta (exp.idBase64.assinatura)
// ============================================================================
export function createAdminToken(accountId = 'master'): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const id = Buffer.from(accountId, 'utf-8').toString('base64url');
  const payload = `${exp}.${id}`;
  return `${payload}.${sign(payload)}`;
}

export function createMasterToken(): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(`master:${exp}`)}`;
}

function parseAdminToken(request: Request): { accountId: string } | null {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [exp, id, sig] = parts;
  if (!exp || !id || !sig) return null;
  if (!safeEqual(sig, sign(`${exp}.${id}`))) return null;
  if (!(Number(exp) > Date.now())) return null;
  try {
    return { accountId: Buffer.from(id, 'base64url').toString('utf-8') };
  } catch {
    return null;
  }
}

export function isAdminRequest(request: Request): boolean {
  return parseAdminToken(request) !== null;
}

export function isMasterAdminRequest(request: Request): boolean {
  if (!isAdminRequest(request)) return false;
  const masterToken = request.headers.get('x-master-token') || '';
  const [exp, sig] = masterToken.split('.');
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(`master:${exp}`))) return false;
  return Number(exp) > Date.now();
}

export interface AdminSession {
  isMaster: boolean;
  accountId: string;
  label: string;
  modules: Record<AdminModuleKey, boolean>;
}

// Resolve a sessão atual. Se a conta foi removida pelo admin mestre, a sessão deixa de valer na hora.
export async function resolveAdminSession(request: Request): Promise<AdminSession | null> {
  const parsed = parseAdminToken(request);
  if (!parsed) return null;

  if (isMasterAdminRequest(request)) {
    return {
      isMaster: true,
      accountId: parsed.accountId,
      label: 'Administrador Principal',
      modules: buildModules(null, true),
    };
  }

  const config = await getAdminAccessConfig();
  const acc = config.accounts.find((a) => a.id === parsed.accountId);
  if (!acc) return null;

  return {
    isMaster: false,
    accountId: acc.id,
    label: acc.label,
    modules: acc.modules,
  };
}

export async function canAccessAdminModule(
  request: Request,
  moduleKey: AdminModuleKey
): Promise<boolean> {
  const session = await resolveAdminSession(request);
  if (!session) return false;
  return session.isMaster || Boolean(session.modules[moduleKey]);
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
    JSON.stringify({ error: 'Acesso restrito ou módulo desativado para a sua conta.' }),
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
