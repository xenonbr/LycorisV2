import { NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  createAdminToken,
  createMasterToken,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { password, mode } = await request.json();
    const check = await verifyAdminCredentials(password);

    // Verificação da segunda senha (Administrador Principal / Nível 2)
    if (mode === 'master') {
      if (check.authenticated && check.isMaster) {
        return NextResponse.json({
          authenticated: true,
          masterToken: createMasterToken(),
          level1Modules: check.level1Modules,
          message: 'Acesso de Administrador Principal liberado',
        });
      }
      return NextResponse.json(
        {
          authenticated: false,
          message: 'Senha do Administrador Principal incorreta.',
        },
        { status: 401 }
      );
    }

    // Login do painel geral (aceita senha de Nível 1, Nível 2 ou senhas extras cadastradas)
    if (check.authenticated) {
      return NextResponse.json({
        authenticated: true,
        token: createAdminToken(),
        masterToken: check.isMaster ? createMasterToken() : undefined,
        level1Modules: check.level1Modules,
        label: check.label,
        message: 'Autenticado com sucesso',
      });
    }

    return NextResponse.json(
      { authenticated: false, message: 'Senha incorreta.' },
      { status: 401 }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
