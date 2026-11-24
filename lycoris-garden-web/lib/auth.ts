import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function getPassword(): string {
  return process.env.ADMIN_PASSWORD || 'LycorisAdmin2026!';
}

function sign(payload: string): string {
  return createHmac('sha256', getPassword()).update(payload).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(password: string): boolean {
  return typeof password === 'string' && safeEqual(password, getPassword());
}

export function createAdminToken(): string {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function isAdminRequest(request: Request): boolean {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export function isWebhookRequest(request: Request): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqual(request.headers.get('x-webhook-secret') || '', secret);
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'Não autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
