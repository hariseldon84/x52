import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';

export const metadata = {
  title: 'Analytics Dashboard | TaskQuest',
  description: 'Insights into your productivity patterns and progress',
};

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirect('/auth/signin');
  }

  return (
    <div className="space-y-6">
      <AnalyticsDashboard />
    </div>
  );
}