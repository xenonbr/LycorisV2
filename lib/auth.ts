import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function getPassword(): string {
  return process.env.ADMIN_PASSWORD || 'lyly2026';
}

function getMasterPassword(): string {
  return process.env.MASTER_ADMIN_PASSWORD || 'ra028899';
}

function sign(payload: string, secret = getPassword()): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(password: string): boolean {
  return (
    typeof password === 'string' &&
    (safeEqual(password, getPassword()) || safeEqual(password, getMasterPassword()))
  );
}

export function checkMasterPassword(password: string): boolean {
  return typeof password === 'string' && safeEqual(password, getMasterPassword());
}

export function createAdminToken(): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function createMasterToken(): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  const payload = `master:${exp}`;
  return `${exp}.${sign(payload, getMasterPassword())}`;
}

export function isAdminRequest(request: Request): boolean {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export function isMasterAdminRequest(request: Request): boolean {
  if (!isAdminRequest(request)) return false;
  const masterToken = request.headers.get('x-master-token') || '';
  const [exp, sig] = masterToken.split('.');
  if (!exp || !sig) return false;
  const payload = `master:${exp}`;
  if (!safeEqual(sig, sign(payload, getMasterPassword()))) return false;
  return Number(exp) > Date.now();
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
