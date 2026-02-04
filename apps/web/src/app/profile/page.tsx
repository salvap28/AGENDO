import { ProfileClientShell } from './ProfileClientShell';
import dynamic from 'next/dynamic';

const CoachSection = dynamic(() => import('./CoachSectionClient'), { ssr: false });

export default async function ProfilePage() {
  return (
    <main className="profile-shell">
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-6 md:px-6 lg:px-0">
        <CoachSection />
        <ProfileClientShell />
      </div>
    </main>
  );
}
