import { NextResponse } from 'next/server';
import {
  getAdminAccessConfig,
  saveAdminAccessConfig,
  resolveAdminSession,
  isMasterAdminRequest,
  unauthorized,
  forbiddenMaster,
  buildModules,
} from '@/lib/auth';
import { AdminAccount } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET:
// - Admin mestre: retorna a senha mestra + todas as contas individuais com seus módulos
// - Conta individual: retorna apenas os módulos liberados para ela (nunca expõe senhas)
export async function GET(request: Request) {
  const session = await resolveAdminSession(request);
  if (!session) return unauthorized();

  if (!session.isMaster) {
    return NextResponse.json({
      myModules: session.modules,
      label: session.label,
    });
  }

  const config = await getAdminAccessConfig();
  return NextResponse.json({
    ...config,
    myModules: session.modules,
    label: session.label,
  });
}

// PUT: apenas o Admin mestre altera a senha mestra e gerencia contas/permissões individuais
export async function PUT(request: Request) {
  if (!isMasterAdminRequest(request)) return forbiddenMaster();

  try {
    const body = await request.json();
    const current = await getAdminAccessConfig();

    const nextMaster =
      typeof body.level2Password === 'string' && body.level2Password.trim().length >= 3
        ? body.level2Password.trim()
        : current.level2Password;

    let nextAccounts: AdminAccount[] = current.accounts;

    if (Array.isArray(body.accounts)) {
      const cleaned: AdminAccount[] = [];
      const seenPasswords = new Set<string>([nextMaster]);

      for (const item of body.accounts) {
        const password = String(item?.password || '').trim();
        const label = String(item?.label || '').trim().slice(0, 60);

        if (!label) {
          return NextResponse.json(
            { error: 'Toda conta precisa de um nome de identificação.' },
            { status: 400 }
          );
        }
        if (password.length < 3) {
          return NextResponse.json(
            { error: `A senha da conta "${label}" precisa ter pelo menos 3 caracteres.` },
            { status: 400 }
          );
        }
        if (seenPasswords.has(password)) {
          return NextResponse.json(
            {
              error: `A senha da conta "${label}" já está em uso (outra conta ou a senha mestra). Escolha uma senha diferente.`,
            },
            { status: 409 }
          );
        }
        seenPasswords.add(password);

        cleaned.push({
          id: String(item?.id || crypto.randomUUID()),
          label,
          password,
          modules: buildModules(item?.modules, false),
          created_at: item?.created_at || new Date().toISOString(),
        });
      }
      nextAccounts = cleaned;
    }

    const saved = await saveAdminAccessConfig({
      level2Password: nextMaster,
      accounts: nextAccounts,
    });

    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao salvar configurações de acesso' },
      { status: 500 }
    );
  }
}
