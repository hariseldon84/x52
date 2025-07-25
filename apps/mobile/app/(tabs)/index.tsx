import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { AchievementProgress } from '@/components/dashboard/AchievementProgress';
import { useDashboard } from '@/hooks/useDashboard';

export default function DashboardScreen() {
  const { 
    dashboardData, 
    loading, 
    refreshing, 
    refresh 
  } = useDashboard();

  return (
    <SafeAreaView edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <DashboardHeader user={dashboardData?.user} />
        
        <StatsOverview 
          stats={dashboardData?.stats}
          loading={loading}
        />
        
        <QuickActions />
        
        <UpcomingTasks 
          tasks={dashboardData?.upcomingTasks}
          loading={loading}
        />
        
        <AchievementProgress 
          achievements={dashboardData?.upcomingAchievements}
          loading={loading}
        />
        
        <RecentActivity 
          activities={dashboardData?.recentActivity}
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}