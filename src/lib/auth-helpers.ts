// 服务端鉴权辅助
import { redirect } from 'next/navigation';
import { auth } from './auth';
import { prisma } from './prisma';
import type { User } from '@prisma/client';

export async function requireUser(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }
  return user;
}

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'desc' },
  });
}

export async function hasModuleAccess(userId: string, moduleSlug: string) {
  const sub = await getActiveSubscription(userId);
  if (!sub) return false;
  try {
    const list = JSON.parse(sub.includedModulesJson) as string[];
    return list.includes(moduleSlug);
  } catch {
    return false;
  }
}
