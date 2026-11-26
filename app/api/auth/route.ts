import { NextResponse } from 'next/server';
import {
  checkPassword,
  checkMasterPassword,
  createAdminToken,
  createMasterToken,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password, mode } = await request.json();

    // Verificação da segunda senha (Administrador Principal)
    if (mode === 'master') {
      if (checkMasterPassword(password)) {
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

    // Login do painel geral (aceita a senha simples ou já a senha principal)
    if (checkPassword(password)) {
      const isMaster = checkMasterPassword(password);
      return NextResponse.json({
        authenticated: true,
        token: createAdminToken(),
        masterToken: isMaster ? createMasterToken() : undefined,
        message: 'Autenticado com sucesso',
      });
    }

    return NextResponse.json({ authenticated: false, message: 'Senha incorreta' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
