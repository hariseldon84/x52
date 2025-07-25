import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // User is authenticated, redirect to dashboard
    redirect('/dashboard');
  } else {
    // User is not authenticated, redirect to login
    redirect('/login');
  }
}
