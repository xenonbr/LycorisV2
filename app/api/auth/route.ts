import { NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  createAdminToken,
  createMasterToken,
  checkRateLimit,
  tooManyRequests,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Rate Limit estrito: máx 8 tentativas de login a cada 60 segundos por IP
  const rl = checkRateLimit(request, 'admin-login', 8, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl.retryAfterSec);
  }

  try {
    const { password, mode } = await request.json();
    const check = await verifyAdminCredentials(password);

    if (mode === 'master') {
      if (check.authenticated && check.isMaster) {
        return NextResponse.json({
          authenticated: true,
          masterToken: createMasterToken(),
          message: 'Acesso de Administrador Principal liberado',
        });
      }
      return NextResponse.json(
        { authenticated: false, message: 'Senha do Administrador Principal incorreta.' },
        { status: 401 }
      );
    }

    if (check.authenticated) {
      return NextResponse.json({
        authenticated: true,
        token: createAdminToken(check.accountId),
        masterToken: check.isMaster ? createMasterToken() : undefined,
        label: check.label,
        message: 'Autenticado com sucesso',
      });
    }

    return NextResponse.json(
      { authenticated: false, message: 'Senha incorreta.' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json({ error: 'Erro ao processar autenticação.' }, { status: 500 });
  }
}
