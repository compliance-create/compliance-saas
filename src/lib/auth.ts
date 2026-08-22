// NextAuth v5 (Auth.js) 配置
// 支持: 邮箱+密码 / 微信小程序(走 /api/wechat/mp-login,不通过 NextAuth)
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      companyName?: string | null;
    } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login' },
  providers: [
    // 邮箱 + 密码(主要给小微企业主用)
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: String(creds.email) } });
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(String(creds.password), user.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          image: user.image,
          role: user.role,
          companyName: user.companyName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; role?: string; companyName?: string | null };
        token.id = u.id;
        token.role = u.role ?? 'USER';
        token.companyName = u.companyName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? 'USER';
        session.user.companyName = token.companyName as string | null;
      }
      return session;
    },
  },
});
