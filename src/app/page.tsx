import { AppShell } from '@/components/app-shell';
import { DebateSetup } from '@/components/debate/debate-setup';

export default function Home() {
  return (
    <AppShell>
      <DebateSetup />
    </AppShell>
  );
}
