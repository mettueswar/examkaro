import { redirect } from 'next/navigation';
import { getAuthPayload } from '@/lib/auth/jwt';
import { queryOne } from '@/lib/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProfileClient } from '@/components/ProfileClient';
import type { User } from '@/types';

export default async function ProfilePage() {
  const auth = await getAuthPayload();
  if (!auth) redirect('/login');

  const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [auth.userId]);
  if (!user) redirect('/');

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <ProfileClient user={user} />
      </main>
      <Footer />
    </>
  );
}
