import { NextResponse } from 'next/server';
import { checkPassword, createAdminToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (checkPassword(password)) {
      return NextResponse.json({
        authenticated: true,
        token: createAdminToken(),
        message: 'Autenticado com sucesso',
      });
    }

    return NextResponse.json({ authenticated: false, message: 'Senha incorreta' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
