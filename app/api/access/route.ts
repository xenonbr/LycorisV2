import { NextResponse } from 'next/server';
import {
  getAdminAccessConfig,
  saveAdminAccessConfig,
  isAdminRequest,
  isMasterAdminRequest,
  unauthorized,
  forbiddenMaster,
  DEFAULT_LEVEL1_MODULES,
} from '@/lib/auth';
import { AdminModuleKey, ExtraAdminPassword } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET:
// - Se Admin Nível 2: retorna toda a configuração (senhas + módulos liberados para Nível 1)
// - Se Admin Nível 1: retorna apenas quais módulos estão liberados (sem expor as senhas)
export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  const config = await getAdminAccessConfig();
  if (!isMasterAdminRequest(request)) {
    return NextResponse.json({
      level1Modules: config.level1Modules,
    });
  }

  return NextResponse.json(config);
}

// PUT: Apenas Admin Nível 2 pode alterar módulos liberados para o Nível 1, trocar senhas ou gerenciar senhas extras
export async function PUT(request: Request) {
  if (!isMasterAdminRequest(request)) return forbiddenMaster();

  try {
    const body = await request.json();
    const current = await getAdminAccessConfig();

    const nextLevel1Password =
      typeof body.level1Password === 'string' && body.level1Password.trim().length >= 3
        ? body.level1Password.trim()
        : current.level1Password;

    const nextLevel2Password =
      typeof body.level2Password === 'string' && body.level2Password.trim().length >= 3
        ? body.level2Password.trim()
        : current.level2Password;

    const nextModules: Record<AdminModuleKey, boolean> = {
      ...DEFAULT_LEVEL1_MODULES,
      ...current.level1Modules,
      ...(body.level1Modules || {}),
    };

    let nextExtraPasswords: ExtraAdminPassword[] = Array.isArray(current.extraPasswords)
      ? [...current.extraPasswords]
      : [];

    if (Array.isArray(body.extraPasswords)) {
      nextExtraPasswords = body.extraPasswords
        .map((item: any) => ({
          id: String(item.id || crypto.randomUUID()),
          label: String(item.label || 'Acesso Extra').trim().slice(0, 60),
          password: String(item.password || '').trim(),
          level: (Number(item.level) === 2 ? 2 : 1) as 1 | 2,
          created_at: item.created_at || new Date().toISOString(),
        }))
        .filter((item: ExtraAdminPassword) => item.password.length >= 3);
    }

    const saved = await saveAdminAccessConfig({
      level1Password: nextLevel1Password,
      level2Password: nextLevel2Password,
      extraPasswords: nextExtraPasswords,
      level1Modules: nextModules,
    });

    return NextResponse.json(saved);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao salvar configurações de acesso' },
      { status: 500 }
    );
  }
}
