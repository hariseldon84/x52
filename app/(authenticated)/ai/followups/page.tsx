'use client';

// Epic 9, Story 9.3: Automated Follow-up Task Creation Page

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
  GitBranch,
  Check,
  X,
  Clock,
  Plus,
  Settings,
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  BarChart3,
  Zap,
  Calendar,
  Link,
  ArrowRight,
  ChevronRight,
  Target,
  Activity,
  Lightbulb,
  Workflow,
  Star
} from 'lucide-react';
import { followupService } from '@/lib/services/followupService';
import type { 
  FollowupTemplate,
  AutomatedFollowup,
  TaskDependency,
  FollowupSuggestion,
  DependencyChain,
  FollowupStats,
  FollowupInsights,
  CreateFollowupTemplateRequest,
  CreateTaskDependencyRequest,
  TemplateType,
  DelayUnit,
  DependencyType,
  DependencyStrictness
} from '@/lib/types/followup';

export default function FollowupsPage() {
  const [templates, setTemplates] = useState<FollowupTemplate[]>([]);
  const [followups, setFollowups] = useState<AutomatedFollowup[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [suggestions, setSuggestions] = useState<FollowupSuggestion[]>([]);
  const [dependencyChains, setDependencyChains] = useState<DependencyChain[]>([]);
  const [stats, setStats] = useState<FollowupStats | null>(null);
  const [insights, setInsights] = useState<FollowupInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);

  // Form states
  const [templateForm, setTemplateForm] = useState<CreateFollowupTemplateRequest>({
    template_name: '',
    template_type: 'completion_followup' as TemplateType,
    description: '',
    trigger_conditions: {},
    followup_config: {},
    delay_amount: 24,
    delay_unit: 'hours' as DelayUnit,
    default_priority: 'medium',
    default_complexity: 'simple',
  });

  const [dependencyForm, setDependencyForm] = useState<CreateTaskDependencyRequest>({
    dependent_task_id: '',
    prerequisite_task_id: '',
    dependency_type: 'blocks' as DependencyType,
    strictness: 'hard' as DependencyStrictness,
    auto_unblock: true,
    notification_enabled: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        templatesData,
        followupsData,
        dependenciesData,
        suggestionsData,
        chainsData,
        statsData,
        insightsData
      ] = await Promise.all([
        followupService.getFollowupTemplates(),
        followupService.getAutomatedFollowups(),
        followupService.getTaskDependencies(),
        followupService.getFollowupSuggestions('pending'),
        followupService.getDependencyChains(),
        followupService.getFollowupStats(),
        followupService.getFollowupInsights(),
      ]);
      
      setTemplates(templatesData);
      setFollowups(followupsData);
      setDependencies(dependenciesData);
      setSuggestions(suggestionsData);
      setDependencyChains(chainsData);
      setStats(statsData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load follow-up data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessFollowups = async () => {
    setProcessing(true);
    try {
      await followupService.processScheduledFollowups();
      await loadData(); // Reload to show processed follow-ups
    } catch (error) {
      console.error('Failed to process follow-ups:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      await followupService.createFollowupTemplate(templateForm);
      setShowTemplateDialog(false);
      setTemplateForm({
        template_name: '',
        template_type: 'completion_followup' as TemplateType,
        description: '',
        trigger_conditions: {},
        followup_config: {},
        delay_amount: 24,
        delay_unit: 'hours' as DelayUnit,
        default_priority: 'medium',
        default_complexity: 'simple',
      });
      loadData();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleCreateDependency = async () => {
    try {
      await followupService.createTaskDependency(dependencyForm);
      setShowDependencyDialog(false);
      setDependencyForm({
        dependent_task_id: '',
        prerequisite_task_id: '',
        dependency_type: 'blocks' as DependencyType,
        strictness: 'hard' as DependencyStrictness,
        auto_unblock: true,
        notification_enabled: true,
      });
      loadData();
    } catch (error) {
      console.error('Failed to create dependency:', error);
    }
  };

  const handleToggleTemplate = async (template: FollowupTemplate) => {
    try {
      await followupService.updateFollowupTemplate(template.id, {
        is_active: !template.is_active,
      });
      loadData();
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const handleCancelFollowup = async (followupId: string) => {
    try {
      await followupService.cancelAutomatedFollowup(followupId, 'User cancelled');
      loadData();
    } catch (error) {
      console.error('Failed to cancel follow-up:', error);
    }
  };

  const handleAcceptSuggestion = async (suggestion: FollowupSuggestion) => {
    try {
      await followupService.acceptFollowupSuggestion({
        suggestion_id: suggestion.id,
      });
      loadData();
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  const handleRejectSuggestion = async (suggestion: FollowupSuggestion) => {
    try {
      await followupService.rejectFollowupSuggestion({
        suggestion_id: suggestion.id,
      });
      loadData();
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50';
      case 'created': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      case 'failed': return 'text-red-600 bg-red-50';
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

  const getTemplateTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'completion_followup': return <Check className="h-4 w-4" />;
      case 'deadline_reminder': return <Clock className="h-4 w-4" />;
      case 'dependency_chain': return <GitBranch className="h-4 w-4" />;
      case 'recurring_review': return <RefreshCw className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getDependencyTypeIcon = (type: DependencyType) => {
    switch (type) {
      case 'blocks': return <X className="h-4 w-4 text-red-500" />;
      case 'enables': return <Check className="h-4 w-4 text-green-500" />;
      case 'informs': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'follows': return <ArrowRight className="h-4 w-4 text-orange-500" />;
      default: return <Link className="h-4 w-4" />;
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
            <Workflow className="h-8 w-8 text-primary" />
            Automated Follow-ups
          </h1>
          <p className="text-muted-foreground">
            Intelligent task dependencies and automatic follow-up creation
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleProcessFollowups} 
            disabled={processing}
            className="flex items-center gap-2"
          >
            {processing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Process Due
          </Button>
          
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                New Dependency
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_templates}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.total_templates} total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.success_rate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_followups}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dependencies Resolved</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dependencies_resolved_today}</div>
              <p className="text-xs text-muted-foreground">today</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="followups">Scheduled</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="chains">Dependency Chains</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Follow-up Suggestions</h3>
                <p className="text-muted-foreground mb-4">
                  Complete some tasks to see intelligent follow-up suggestions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {suggestion.suggested_title}
                        </CardTitle>
                        {suggestion.suggested_description && (
                          <CardDescription className="mt-1">
                            {suggestion.suggested_description}
                          </CardDescription>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {suggestion.suggestion_type.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={suggestion.suggested_priority ? getPriorityColor(suggestion.suggested_priority) : ''}
                          >
                            {suggestion.suggested_priority || 'medium'}
                          </Badge>
                          <Badge variant="secondary">
                            {(suggestion.confidence_score * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {suggestion.suggestion_reasoning && (
                      <div className="bg-muted/50 rounded p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className="h-3 w-3" />
                          <span className="font-medium">AI Reasoning</span>
                        </div>
                        <p className="text-muted-foreground">{suggestion.suggestion_reasoning}</p>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Source Task:</span>
                        <span>{suggestion.source_task?.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-medium">Triggered by:</span>
                        <span>{suggestion.trigger_event.replace('_', ' ')}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRejectSuggestion(suggestion)}
                        className="flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followups" className="space-y-4">
          <div className="grid gap-4">
            {followups.map((followup) => (
              <Card key={followup.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{followup.followup_title}</h3>
                        <Badge variant="outline" className={getStatusColor(followup.status)}>
                          {followup.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(followup.followup_priority)}>
                          {followup.followup_priority}
                        </Badge>
                      </div>
                      
                      {followup.followup_description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {followup.followup_description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {followup.status === 'scheduled' 
                              ? `Due: ${new Date(followup.scheduled_for).toLocaleString()}`
                              : `Processed: ${followup.processed_at ? new Date(followup.processed_at).toLocaleString() : 'N/A'}`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <span>From: {followup.trigger_task?.title}</span>
                        </div>
                        {followup.template && (
                          <div className="flex items-center gap-1">
                            <Settings className="h-3 w-3" />
                            <span>Template: {followup.template.template_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {followup.status === 'scheduled' && !followup.user_cancelled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelFollowup(followup.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getTemplateTypeIcon(template.template_type)}
                        <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {template.description && (
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleTemplate(template)}
                    >
                      {template.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Type:</span>
                      <div className="capitalize">{template.template_type.replace('_', ' ')}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Delay:</span>
                      <div>{template.delay_amount} {template.delay_unit}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Times Used:</span>
                      <div>{template.times_triggered}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Success Rate:</span>
                      <div>
                        {template.success_rate 
                          ? `${(template.success_rate * 100).toFixed(1)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-4">
          <div className="grid gap-4">
            {dependencies.map((dependency) => (
              <Card key={dependency.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {dependency.prerequisite_task?.title}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={getPriorityColor(dependency.prerequisite_task?.priority || 'medium')}
                        >
                          {dependency.prerequisite_task?.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col items-center gap-1">
                        {getDependencyTypeIcon(dependency.dependency_type)}
                        <span className="text-xs text-muted-foreground capitalize">
                          {dependency.dependency_type}
                        </span>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {dependency.dependent_task?.title}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={getPriorityColor(dependency.dependent_task?.priority || 'medium')}
                        >
                          {dependency.dependent_task?.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={dependency.strictness === 'hard' ? 'default' : 'secondary'}>
                          {dependency.strictness}
                        </Badge>
                        {dependency.resolved_at && (
                          <Badge variant="outline" className="text-green-600 bg-green-50">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dependency.auto_unblock ? 'Auto-unblock' : 'Manual unblock'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chains" className="space-y-4">
          {dependencyChains.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Dependency Chains</h3>
                <p className="text-muted-foreground">
                  Create task dependencies to see dependency chains and progress tracking
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {dependencyChains.map((chain) => (
                <Card key={chain.chain_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        Dependency Chain
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground">
                          {Math.round(chain.completion_progress * 100)}% complete
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${chain.completion_progress * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      {chain.tasks.map((task, index) => (
                        <React.Fragment key={task.task_id}>
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                              <span className="text-xs font-medium">{index + 1}</span>
                            </div>
                            <div className="text-sm font-medium text-center max-w-24 truncate">
                              {task.task_title}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`mt-1 text-xs ${task.status === 'completed' ? 'text-green-600 bg-green-50' : ''}`}
                            >
                              {task.status}
                            </Badge>
                          </div>
                          
                          {index < chain.tasks.length - 1 && (
                            <ChevronRight className="h-6 w-6 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {chain.blocking_issues.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-800">Blocking Issues</span>
                        </div>
                        {chain.blocking_issues.map((issue, index) => (
                          <div key={index} className="text-sm text-red-700 mb-1">
                            {issue.issue_description}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {chain.estimated_completion_date && (
                      <div className="text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Estimated completion: {new Date(chain.estimated_completion_date).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Most Effective Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.most_effective_templates.map((template, index) => (
                      <div key={template.template_name} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{template.template_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Used {template.usage_count} times
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {(template.success_rate * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Optimal Delay Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(insights.optimal_delay_patterns).map(([delay, count]) => (
                      <div key={delay} className="flex justify-between items-center">
                        <span className="text-sm">{delay}</span>
                        <Badge variant="secondary">{count} successful</Badge>
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
                  Start using follow-up automation to see personalized insights
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Follow-up Template</DialogTitle>
            <DialogDescription>
              Define rules for automatic follow-up task creation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateForm.template_name}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    template_name: e.target.value 
                  }))}
                  placeholder="e.g., Post-completion Review"
                />
              </div>
              
              <div>
                <Label htmlFor="template-type">Template Type</Label>
                <Select 
                  value={templateForm.template_type} 
                  onValueChange={(value) => setTemplateForm(prev => ({ 
                    ...prev, 
                    template_type: value as TemplateType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completion_followup">Completion Follow-up</SelectItem>
                    <SelectItem value="deadline_reminder">Deadline Reminder</SelectItem>
                    <SelectItem value="dependency_chain">Dependency Chain</SelectItem>
                    <SelectItem value="recurring_review">Recurring Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                placeholder="Describe when and how this template should be used..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="delay-amount">Delay Amount</Label>
                <Input
                  id="delay-amount"
                  type="number"
                  min="0"
                  value={templateForm.delay_amount}
                  onChange={(e) => setTemplateForm(prev => ({ 
                    ...prev, 
                    delay_amount: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="delay-unit">Delay Unit</Label>
                <Select 
                  value={templateForm.delay_unit} 
                  onValueChange={(value) => setTemplateForm(prev => ({ 
                    ...prev, 
                    delay_unit: value as DelayUnit 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="default-priority">Default Priority</Label>
                <Select 
                  value={templateForm.default_priority} 
                  onValueChange={(value) => setTemplateForm(prev => ({ 
                    ...prev, 
                    default_priority: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dependency Dialog */}
      <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Task Dependency</DialogTitle>
            <DialogDescription>
              Define how tasks depend on each other
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="prerequisite-task">Prerequisite Task ID</Label>
              <Input
                id="prerequisite-task"
                value={dependencyForm.prerequisite_task_id}
                onChange={(e) => setDependencyForm(prev => ({ 
                  ...prev, 
                  prerequisite_task_id: e.target.value 
                }))}
                placeholder="Task that must be completed first"
              />
            </div>
            
            <div>
              <Label htmlFor="dependent-task">Dependent Task ID</Label>
              <Input
                id="dependent-task"
                value={dependencyForm.dependent_task_id}
                onChange={(e) => setDependencyForm(prev => ({ 
                  ...prev, 
                  dependent_task_id: e.target.value 
                }))}
                placeholder="Task that depends on the prerequisite"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dependency-type">Dependency Type</Label>
                <Select 
                  value={dependencyForm.dependency_type} 
                  onValueChange={(value) => setDependencyForm(prev => ({ 
                    ...prev, 
                    dependency_type: value as DependencyType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocks">Blocks</SelectItem>
                    <SelectItem value="enables">Enables</SelectItem>
                    <SelectItem value="informs">Informs</SelectItem>
                    <SelectItem value="follows">Follows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="strictness">Strictness</Label>
                <Select 
                  value={dependencyForm.strictness} 
                  onValueChange={(value) => setDependencyForm(prev => ({ 
                    ...prev, 
                    strictness: value as DependencyStrictness 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-unblock"
                  checked={dependencyForm.auto_unblock}
                  onChange={(e) => setDependencyForm(prev => ({ 
                    ...prev, 
                    auto_unblock: e.target.checked 
                  }))}
                />
                <Label htmlFor="auto-unblock">Auto-unblock dependent task when prerequisite completes</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notification-enabled"
                  checked={dependencyForm.notification_enabled}
                  onChange={(e) => setDependencyForm(prev => ({ 
                    ...prev, 
                    notification_enabled: e.target.checked 
                  }))}
                />
                <Label htmlFor="notification-enabled">Send notifications when dependency is resolved</Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDependencyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDependency}>
              Create Dependency
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}