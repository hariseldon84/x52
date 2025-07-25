'use client';

// Epic 9, Story 9.4: Context-Aware Notification System Page

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell,
  Check,
  X,
  Clock,
  Settings,
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  BarChart3,
  Smartphone,
  Mail,
  Monitor,
  Moon,
  Sun,
  Focus,
  Activity,
  Target,
  TrendingUp,
  User,
  MapPin,
  Volume2,
  VolumeX,
  Calendar,
  Zap,
  Eye,
  EyeOff,
  Brain,
  MessageSquare
} from 'lucide-react';
import { notificationService } from '@/lib/services/notificationService';
import type { 
  NotificationPreferences,
  UserContext,
  SmartNotification,
  NotificationRule,
  NotificationStats,
  NotificationInsights,
  ContextAnalysis,
  UpdateNotificationPreferencesRequest,
  UpdateUserContextRequest,
  CreateNotificationRuleRequest,
  NotificationChannel,
  UserActivity,
  LocationType,
  DeviceType,
  FocusModeType,
  RuleType,
  NotificationStatus
} from '@/lib/types/notifications';

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [context, setContext] = useState<UserContext | null>(null);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [insights, setInsights] = useState<NotificationInsights | null>(null);
  const [contextAnalysis, setContextAnalysis] = useState<ContextAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showFocusDialog, setShowFocusDialog] = useState(false);

  // Form states
  const [ruleForm, setRuleForm] = useState<CreateNotificationRuleRequest>({
    rule_name: '',
    rule_type: 'context_filter' as RuleType,
    description: '',
    conditions: {},
    actions: {},
    priority: 0,
  });

  const [focusSession, setFocusSession] = useState({
    type: 'deep_work' as FocusModeType,
    duration: 60,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        preferencesData,
        contextData,
        notificationsData,
        rulesData,
        statsData,
        insightsData,
        contextAnalysisData
      ] = await Promise.all([
        notificationService.getNotificationPreferences(),
        notificationService.getUserContext(),
        notificationService.getNotifications(),
        notificationService.getNotificationRules(),
        notificationService.getNotificationStats(),
        notificationService.getNotificationInsights(),
        notificationService.analyzeCurrentContext(),
      ]);
      
      setPreferences(preferencesData);
      setContext(contextData);
      setNotifications(notificationsData);
      setRules(rulesData);
      setStats(statsData);
      setInsights(insightsData);
      setContextAnalysis(contextAnalysisData);
    } catch (error) {
      console.error('Failed to load notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (updates: UpdateNotificationPreferencesRequest) => {
    try {
      const updatedPrefs = await notificationService.updateNotificationPreferences(updates);
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleUpdateContext = async (updates: UpdateUserContextRequest) => {
    try {
      const updatedContext = await notificationService.updateUserContext(updates);
      setContext(updatedContext);
      // Refresh context analysis
      const newAnalysis = await notificationService.analyzeCurrentContext();
      setContextAnalysis(newAnalysis);
    } catch (error) {
      console.error('Failed to update context:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      await notificationService.createNotificationRule(ruleForm);
      setShowRuleDialog(false);
      setRuleForm({
        rule_name: '',
        rule_type: 'context_filter' as RuleType,
        description: '',
        conditions: {},
        actions: {},
        priority: 0,
      });
      loadData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleToggleRule = async (rule: NotificationRule) => {
    try {
      await notificationService.updateNotificationRule(rule.id, {
        is_active: !rule.is_active,
      });
      loadData();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      loadData();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      await notificationService.dismissNotification(notificationId);
      loadData();
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const handleStartFocusSession = async () => {
    try {
      await notificationService.startFocusSession(focusSession.type, focusSession.duration);
      setShowFocusDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to start focus session:', error);
    }
  };

  const handleEndFocusSession = async () => {
    try {
      await notificationService.endFocusSession();
      loadData();
    } catch (error) {
      console.error('Failed to end focus session:', error);
    }
  };

  const getStatusColor = (status: NotificationStatus) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'dismissed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'in_app': return <Monitor className="h-4 w-4" />;
      case 'push': return <Smartphone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getActivityIcon = (activity: UserActivity) => {
    switch (activity) {
      case 'working': return <Target className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'break': return <Clock className="h-4 w-4" />;
      case 'commuting': return <MapPin className="h-4 w-4" />;
      case 'offline': return <EyeOff className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Smart Notifications
          </h1>
          <p className="text-muted-foreground">
            Context-aware notifications that adapt to your activity and preferences
          </p>
        </div>
        
        <div className="flex gap-2">
          {context?.is_in_focus_mode ? (
            <Button 
              onClick={handleEndFocusSession}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              End Focus
            </Button>
          ) : (
            <Dialog open={showFocusDialog} onOpenChange={setShowFocusDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Focus className="h-4 w-4" />
                  Focus Mode
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
          
          <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                New Rule
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Context Status */}
      {contextAnalysis && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Current Context Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(contextAnalysis.current_context_score * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Context Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round(contextAnalysis.context_factors.time_appropriateness * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Time Appropriate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round(contextAnalysis.context_factors.activity_compatibility * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Activity Compatible</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round(contextAnalysis.context_factors.availability_status * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </div>
            
            {contextAnalysis.recommendations?.context_improvements.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <div className="font-medium text-blue-800 mb-2">Context Recommendations:</div>
                <ul className="text-sm text-blue-700 space-y-1">
                  {contextAnalysis.recommendations.context_improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-0.5" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.delivery_rate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.click_through_rate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notifications_today}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.user_satisfaction_score * 100).toFixed(0)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <div className="grid gap-4">
            {notifications.map((notification) => (
              <Card key={notification.id} className={`border-l-4 ${
                notification.read_at ? 'border-l-gray-300' : 'border-l-primary'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className={`text-lg ${notification.read_at ? 'text-muted-foreground' : ''}`}>
                          {notification.title}
                        </CardTitle>
                        <Badge variant="outline" className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(notification.priority_level)}>
                          {notification.priority_level}
                        </Badge>
                      </div>
                      <CardDescription>
                        {notification.message}
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(notification.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Brain className="h-3 w-3" />
                          <span>Context: {Math.round(notification.context_score * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {notification.channels.map((channel, index) => (
                            <span key={index} className="flex items-center gap-1">
                              {getChannelIcon(channel)}
                              <span className="capitalize">{channel}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    {!notification.read_at && (
                      <Button 
                        size="sm" 
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Mark Read
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDismissNotification(notification.id)}
                      className="flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Dismiss
                    </Button>
                    {notification.related_task && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="flex items-center gap-1"
                      >
                        <Target className="h-3 w-3" />
                        View Task
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="context" className="space-y-4">
          {context && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Current Context
                </CardTitle>
                <CardDescription>
                  Update your current activity and availability for better notification timing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="activity">Current Activity</Label>
                    <Select
                      value={context.current_activity || 'working'}
                      onValueChange={(value) => handleUpdateContext({ 
                        current_activity: value as UserActivity 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="working">Working</SelectItem>
                        <SelectItem value="meeting">In Meeting</SelectItem>
                        <SelectItem value="break">On Break</SelectItem>
                        <SelectItem value="commuting">Commuting</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Select
                      value={context.current_location_type || 'office'}
                      onValueChange={(value) => handleUpdateContext({ 
                        current_location_type: value as LocationType 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="travel">Traveling</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="device">Device</Label>
                    <Select
                      value={context.current_device || 'desktop'}
                      onValueChange={(value) => handleUpdateContext({ 
                        current_device: value as DeviceType 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="availability"
                    checked={context.is_available}
                    onCheckedChange={(checked) => handleUpdateContext({ 
                      is_available: checked 
                    })}
                  />
                  <Label htmlFor="availability">I'm available for notifications</Label>
                </div>
                
                {context.is_in_focus_mode && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Focus className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-800">Focus Mode Active</div>
                          <div className="text-sm text-blue-600">
                            {context.focus_mode_type} until {
                              context.focus_mode_until ? 
                              new Date(context.focus_mode_until).toLocaleTimeString() : 
                              'manually ended'
                            }
                          </div>
                        </div>
                      </div>
                      <Button size="sm" onClick={handleEndFocusSession}>
                        End Focus
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          {preferences && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <CardDescription>
                    Choose how you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="notifications-enabled"
                      checked={preferences.notifications_enabled}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        notifications_enabled: checked 
                      })}
                    />
                    <Label htmlFor="notifications-enabled" className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Enable notifications
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="in-app-notifications"
                      checked={preferences.in_app_notifications}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        in_app_notifications: checked 
                      })}
                    />
                    <Label htmlFor="in-app-notifications" className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      In-app notifications
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="push-notifications"
                      checked={preferences.push_notifications}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        push_notifications: checked 
                      })}
                    />
                    <Label htmlFor="push-notifications" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Push notifications
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email-notifications"
                      checked={preferences.email_notifications}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        email_notifications: checked 
                      })}
                    />
                    <Label htmlFor="email-notifications" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email notifications
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Smart Features</CardTitle>
                  <CardDescription>
                    Let AI optimize when and how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="context-awareness"
                      checked={preferences.context_awareness_enabled}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        context_awareness_enabled: checked 
                      })}
                    />
                    <Label htmlFor="context-awareness" className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Context-aware delivery
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="time-based-optimization"
                      checked={preferences.time_based_optimization}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        time_based_optimization: checked 
                      })}
                    />
                    <Label htmlFor="time-based-optimization" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time-based optimization
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="activity-filtering"
                      checked={preferences.activity_based_filtering}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        activity_based_filtering: checked 
                      })}
                    />
                    <Label htmlFor="activity-filtering" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Activity-based filtering
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="batch-notifications"
                      checked={preferences.batch_similar_notifications}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        batch_similar_notifications: checked 
                      })}
                    />
                    <Label htmlFor="batch-notifications" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Batch similar notifications
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5" />
                    Quiet Hours
                  </CardTitle>
                  <CardDescription>
                    Set times when you don't want to be disturbed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="quiet-hours"
                      checked={preferences.quiet_hours_enabled}
                      onCheckedChange={(checked) => handleUpdatePreferences({ 
                        quiet_hours_enabled: checked 
                      })}
                    />
                    <Label htmlFor="quiet-hours">Enable quiet hours</Label>
                  </div>
                  
                  {preferences.quiet_hours_enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quiet-start">Start Time</Label>
                        <Input
                          id="quiet-start"
                          type="time"
                          value={preferences.quiet_hours_start}
                          onChange={(e) => handleUpdatePreferences({ 
                            quiet_hours_start: e.target.value 
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quiet-end">End Time</Label>
                        <Input
                          id="quiet-end"
                          type="time"
                          value={preferences.quiet_hours_end}
                          onChange={(e) => handleUpdatePreferences({ 
                            quiet_hours_end: e.target.value 
                          })}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {rule.rule_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {rule.description && (
                        <CardDescription className="mt-1">
                          {rule.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleRule(rule)}
                    >
                      {rule.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Priority:</span> {rule.priority}
                    </div>
                    <div>
                      <span className="font-medium">Applied:</span> {rule.times_applied} times
                    </div>
                    {rule.success_rate && (
                      <div>
                        <span className="font-medium">Success Rate:</span> {(rule.success_rate * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Channel Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(insights.delivery_effectiveness.channel_performance).map(([channel, data]) => (
                      <div key={channel} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getChannelIcon(channel as NotificationChannel)}
                          <span className="capitalize">{channel}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {(data.response_rate * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">response rate</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Peak Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats?.peak_notification_hours.map((hour, index) => (
                      <div key={hour} className="flex justify-between items-center">
                        <span>{hour}</span>
                        <Badge variant="secondary">Peak #{index + 1}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Improvement Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.improvement_recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
                <p className="text-muted-foreground">
                  Use notifications for a while to see personalized insights
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Notification Rule</DialogTitle>
            <DialogDescription>
              Define custom rules for how notifications should be handled
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={ruleForm.rule_name}
                  onChange={(e) => setRuleForm(prev => ({ 
                    ...prev, 
                    rule_name: e.target.value 
                  }))}
                  placeholder="e.g., Meeting Mode Filter"
                />
              </div>
              
              <div>
                <Label htmlFor="rule-type">Rule Type</Label>
                <Select 
                  value={ruleForm.rule_type} 
                  onValueChange={(value) => setRuleForm(prev => ({ 
                    ...prev, 
                    rule_type: value as RuleType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="context_filter">Context Filter</SelectItem>
                    <SelectItem value="time_based">Time Based</SelectItem>
                    <SelectItem value="frequency_limit">Frequency Limit</SelectItem>
                    <SelectItem value="priority_boost">Priority Boost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={ruleForm.description}
                onChange={(e) => setRuleForm(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                placeholder="Describe what this rule does..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="rule-priority">Priority (higher numbers run first)</Label>
              <Input
                id="rule-priority"
                type="number"
                value={ruleForm.priority}
                onChange={(e) => setRuleForm(prev => ({ 
                  ...prev, 
                  priority: parseInt(e.target.value) || 0 
                }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule}>
              Create Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Focus Session Dialog */}
      <Dialog open={showFocusDialog} onOpenChange={setShowFocusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Focus Session</DialogTitle>
            <DialogDescription>
              Enter focus mode to reduce distractions and limit notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="focus-type">Focus Type</Label>
              <Select
                value={focusSession.type}
                onValueChange={(value) => setFocusSession(prev => ({ 
                  ...prev, 
                  type: value as FocusModeType 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deep_work">Deep Work</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="break">Break</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="focus-duration">Duration (minutes)</Label>
              <Input
                id="focus-duration"
                type="number"
                min="5"
                max="480"
                value={focusSession.duration}
                onChange={(e) => setFocusSession(prev => ({ 
                  ...prev, 
                  duration: parseInt(e.target.value) || 60 
                }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFocusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartFocusSession}>
              Start Focus Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}