import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { SettingsForm } from '@/components/modules/SettingsForm';

export default async function SettingsPage() {
  const user = await requireUser();
  const assumption = await prisma.industryAssumption.findFirst({
    where: { userId: user.id },
  });
  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold">设置</h1>
      <SettingsForm
        user={{
          name: user.name,
          email: user.email,
          companyName: user.companyName,
          industryCode: user.industryCode,
        }}
        assumption={
          assumption
            ? {
                revenueCents: assumption.revenueCents,
                grossMargin: assumption.grossMargin,
                headcount: assumption.headcount,
                avgSalaryCents: assumption.avgSalaryCents,
                industryCode: assumption.industryCode,
              }
            : null
        }
      />
    </div>
  );
}
