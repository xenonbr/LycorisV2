import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { AdminAccessConfig, AdminModuleKey } from '@/lib/types';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
const BUCKET_NAME = 'lycoris-media';
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
  return `${getEnvMasterPassword()}::${getEnvLevel1Password()}::lycoris-hmac`;
}

let cachedAccessConfig: AdminAccessConfig = {
  level1Password: getEnvLevel1Password(),
  level2Password: getEnvMasterPassword(),
  extraPasswords: [],
  level1Modules: { ...DEFAULT_LEVEL1_MODULES },
};

export async function getAdminAccessConfig(): Promise<AdminAccessConfig> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(ACCESS_CONFIG_PATH);
      if (!error && data) {
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
      // Usa configuração padrão se o arquivo ainda não existir
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
    const buffer = Buffer.from(JSON.stringify(sanitized, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(ACCESS_CONFIG_PATH, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
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

// Verifica uma senha contra a configuração salva no Supabase Storage (Nível 1, Nível 2 e senhas extras)
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

  // 1. Senha Principal de Nível 2
  if (safeEqual(input, config.level2Password)) {
    return {
      authenticated: true,
      isMaster: true,
      label: 'Administrador Principal (Nível 2)',
      level1Modules: config.level1Modules,
    };
  }

  // 2. Senha Padrão de Nível 1
  if (safeEqual(input, config.level1Password)) {
    return {
      authenticated: true,
      isMaster: false,
      label: 'Administrador Nível 1',
      level1Modules: config.level1Modules,
    };
  }

  // 3. Senhas Extras Cadastradas no Painel
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

export function checkPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    (safeEqual(password, cachedAccessConfig.level1Password) ||
      safeEqual(password, cachedAccessConfig.level2Password))
  );
}

export function checkMasterPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    safeEqual(password, cachedAccessConfig.level2Password)
  );
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
  if (
    !safeEqual(sig, sign(exp)) &&
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
  if (
    !safeEqual(sig, sign(payload)) &&
    !safeEqual(sig, sign(payload, getEnvMasterPassword()))
  ) {
    return false;
  }
  return Number(exp) > Date.now();
}

// Verifica se a requisição tem acesso a um módulo específico (Admin Nível 2 sempre tem; Admin Nível 1 depende da caixinha marcada)
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
    JSON.stringify({ error: 'Acesso restrito ao Administrador Principal.' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
