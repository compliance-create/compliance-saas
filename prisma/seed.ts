// =====================================================
// Prisma seed 脚本
// 1. 写入模块元数据(劳动 / 合同 / 未来税法)
// 2. 写入审核点清单(劳动 79 + 合同 ~100)
// 3. 写入行业方法论 CMS 页面
// 4. 创建演示用户 + 演示订阅(便于立刻体验)
// =====================================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { modules } from '../src/lib/modules/registry';
import { labourItems } from '../src/lib/data/labour-items';
import { contractItems } from '../src/lib/data/contract-items';
import { methodPages } from '../src/lib/data/method-content';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed start');

  // 1. 模块
  for (const m of modules) {
    await prisma.module.upsert({
      where: { slug: m.slug },
      update: {
        name: m.name,
        description: m.description,
        category: m.category,
        iconName: m.iconName,
        orderIndex: m.orderIndex,
        enabled: m.enabled,
      },
      create: m,
    });
  }
  console.log(`  ✓ ${modules.length} modules`);

  // 2. 审核点
  for (const m of modules) {
    const items = m.slug === 'labour' ? labourItems : m.slug === 'contract' ? contractItems : [];
    if (items.length === 0) continue;
    const moduleRow = await prisma.module.findUnique({ where: { slug: m.slug } });
    if (!moduleRow) continue;
    // 先清空旧的(基于 moduleId)
    await prisma.checklistItem.deleteMany({ where: { moduleId: moduleRow.id } });
    for (const it of items) {
      await prisma.checklistItem.create({
        data: {
          moduleId: moduleRow.id,
          chapter: it.chapter,
          chapterTitle: it.chapterTitle,
          orderIndex: it.orderIndex,
          title: it.title,
          keyPoints: it.keyPoints,
          legalBasis: JSON.stringify(it.legalBasis),
          riskLevel: it.riskLevel,
          impactKey: it.impactKey ?? null,
          impactFormula: it.impactKey ?? null,
          answerSchema: JSON.stringify(it.answerSchema),
        },
      });
    }
    console.log(`  ✓ ${m.slug}: ${items.length} items`);
  }

  // 3. CMS 页面(行业方法论)
  for (const page of methodPages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, body: page.body },
      create: { ...page, published: true },
    });
  }
  console.log(`  ✓ ${methodPages.length} cms pages`);

  // 4. 演示用户
  const demoEmail = 'demo@example.com';
  const demoPassword = await bcrypt.hash('demo1234', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: '演示用户',
      password: demoPassword,
      companyName: '示例小微企业',
      industryCode: 'general',
      role: 'USER',
    },
    create: {
      email: demoEmail,
      name: '演示用户',
      password: demoPassword,
      companyName: '示例小微企业',
      industryCode: 'general',
      role: 'USER',
    },
  });

  // 5. 演示订阅(包年,含所有模块)
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  await prisma.subscription.upsert({
    where: { wechatOrderNo: 'demo-order-001' },
    update: {
      status: 'ACTIVE',
      expiresAt: oneYearLater,
      paidAt: new Date(),
      paidAmountCents: Number(process.env.PRICE_ANNUAL_CNY ?? 99800),
    },
    create: {
      userId: demoUser.id,
      planCode: 'ANNUAL_PACK',
      status: 'ACTIVE',
      startedAt: new Date(),
      expiresAt: oneYearLater,
      paidAt: new Date(),
      paidAmountCents: Number(process.env.PRICE_ANNUAL_CNY ?? 99800),
      wechatOrderNo: 'demo-order-001',
      wechatTransactionId: 'demo-tx-001',
      includedModulesJson: JSON.stringify(['labour', 'contract']),
    },
  });

  // 6. 管理员
  const adminEmail = 'admin@example.com';
  const adminPassword = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: adminEmail,
      name: '管理员',
      password: adminPassword,
      role: 'SUPER_ADMIN',
      companyName: '平台运营',
    },
  });

  console.log('🌱 Seed done.');
  console.log('   demo user: demo@example.com / demo1234');
  console.log('   admin    : admin@example.com / admin1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
