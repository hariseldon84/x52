// Epic 7, Story 7.5: Social Activity Feed Page

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, TrendingUp, Hash, Globe, UserCheck, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { activityFeedService } from '@/lib/services/activityFeedService';
import type { SocialActivity, ActivityStats } from '@/lib/types/social';

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [trendingActivities, setTrendingActivities] = useState<SocialActivity[]>([]);
  const [personalActivities, setPersonalActivities] = useState<SocialActivity[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('public');
  const { toast } = useToast();

  useEffect(() => {
    loadActivityFeed();
    loadActivityStats();
  }, [activeTab]);

  const loadActivityFeed = async () => {
    try {
      setIsLoading(true);
      
      const feedType = activeTab as 'public' | 'following' | 'friends' | 'personal';
      
      const [feedData, trendingData, personalData] = await Promise.all([
        activityFeedService.getActivityFeed({ type: feedType, limit: 20 }),
        activeTab === 'public' ? activityFeedService.getTrendingActivities('day', 10) : Promise.resolve([]),
        activeTab === 'personal' ? [] : activityFeedService.getActivityFeed({ type: 'personal', limit: 10 }),
      ]);

      setActivities(feedData);
      setTrendingActivities(trendingData);
      if (activeTab !== 'personal') {
        setPersonalActivities(personalData);
      }
    } catch (error) {
      console.error('Error loading activity feed:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity feed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivityStats = async () => {
    try {
      const stats = await activityFeedService.getActivityStats();
      setActivityStats(stats);
    } catch (error) {
      console.error('Error loading activity stats:', error);
    }
  };

  const handleLike = async (activityId: string) => {
    try {
      setActionLoading(activityId);
      const result = await activityFeedService.toggleLike(activityId);
      
      // Update the activity in state
      setActivities(prev => prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, is_liked: result.liked, like_count: result.like_count }
          : activity
      ));

      setTrendingActivities(prev => prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, is_liked: result.liked, like_count: result.like_count }
          : activity
      ));

      toast({
        title: result.liked ? 'Liked!' : 'Unliked',
        description: result.liked ? 'You liked this activity.' : 'You removed your like.',
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleComment = async (activityId: string) => {
    // For now, just show a toast - would open comment dialog
    toast({
      title: 'Coming Soon',
      description: 'Comment functionality will be available soon.',
    });
  };

  const handleShare = async (activityId: string) => {
    try {
      setActionLoading(activityId);
      await activityFeedService.shareActivity(activityId);
      
      toast({
        title: 'Shared!',
        description: 'Activity has been shared to your feed.',
      });

      // Reload the feed to show the shared activity
      await loadActivityFeed();
    } catch (error) {
      console.error('Error sharing activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to share activity. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleHide = async (activityId: string) => {
    try {
      await activityFeedService.hideActivity(activityId);
      
      // Remove from current view
      setActivities(prev => prev.filter(activity => activity.id !== activityId));
      setTrendingActivities(prev => prev.filter(activity => activity.id !== activityId));
      
      toast({
        title: 'Hidden',
        description: 'Activity hidden from your feed.',
      });
    } catch (error) {
      console.error('Error hiding activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to hide activity.',
        variant: 'destructive',
      });
    }
  };

  const handleReport = async (activityId: string) => {
    // For now, just show a toast - would open report dialog
    toast({
      title: 'Coming Soon',
      description: 'Report functionality will be available soon.',
    });
  };

  const renderActivityFeed = (activityList: SocialActivity[], showEmpty = true) => {
    if (activityList.length === 0 && showEmpty) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No activities yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'personal' 
              ? 'Your activities will appear here as you use the app.'
              : 'Activities from your network will appear here.'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {activityList.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onHide={handleHide}
            onReport={handleReport}
            isLoading={actionLoading === activity.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Activity Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Stay connected with your productivity community
          </p>
        </div>
        <Button variant="outline" className="mt-4 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" />
          Share Update
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-3">
          {/* Feed Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="public" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Public</span>
              </TabsTrigger>
              <TabsTrigger value="following" className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Following</span>
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Friends</span>
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">My Feed</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="public">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                renderActivityFeed(activities)
              )}
            </TabsContent>

            <TabsContent value="following">
              {renderActivityFeed(activities)}
            </TabsContent>

            <TabsContent value="friends">
              {renderActivityFeed(activities)}
            </TabsContent>

            <TabsContent value="personal">
              {renderActivityFeed(activities)}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Activity Stats */}
          {activityStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Activity</CardTitle>
                <CardDescription>Your social engagement stats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Activities</span>
                  <span className="font-semibold">{activityStats.total_activities}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Likes Received</span>
                  <span className="font-semibold">{activityStats.total_likes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Comments</span>
                  <span className="font-semibold">{activityStats.total_comments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Followers</span>
                  <span className="font-semibold">{activityStats.followers_count}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trending Activities */}
          {activeTab === 'public' && trendingActivities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Today
                </CardTitle>
                <CardDescription>Most engaging activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingActivities.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <span className="text-sm font-medium truncate">
                        {activity.user?.full_name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{activity.like_count} likes</span>
                      <span>{activity.comment_count} comments</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Personal Activities */}
          {activeTab !== 'personal' && personalActivities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Recent Activity</CardTitle>
                <CardDescription>Your latest achievements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {personalActivities.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-blue-600">
                      {activity.activity_type === 'achievement_unlock' && '🏆'}
                      {activity.activity_type === 'level_up' && '⬆️'}
                      {activity.activity_type === 'task_complete' && '✅'}
                      {activity.activity_type === 'streak_milestone' && '🔥'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Popular Hashtags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Popular Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['productivity', 'goals', 'motivation', 'achievement', 'learning'].map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}