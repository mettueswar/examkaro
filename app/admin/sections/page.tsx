import { redirect } from 'next/navigation';

export default function AdminSectionsRedirectPage() {
  redirect('/admin/subjects');
}
