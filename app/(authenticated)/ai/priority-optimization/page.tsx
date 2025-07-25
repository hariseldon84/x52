'use client';

// Epic 9, Story 9.2: Smart Priority Optimization Page

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
  ArrowUpDown,
  Check,
  X,
  Clock,
  Target,
  TrendingUp,
  Brain,
  Settings,
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  BarChart3,
  Zap,
  Calendar,
  Filter,
  ChevronRight,
  Star,
  Activity
} from 'lucide-react';
import { priorityOptimizationService } from '@/lib/services/priorityOptimizationService';
import type { 
  PriorityRecommendation,
  PriorityOptimizationRule,
  PriorityOptimizationSchedule,
  PriorityOptimizationHistory,
  PriorityOptimizationStats,
  OptimizationInsights,
  CreateOptimizationRuleRequest,
  CreateOptimizationScheduleRequest,
  RuleType,
  ScheduleType,
  OptimizationScope
} from '@/lib/types/priority';

export default function PriorityOptimizationPage() {
  const [recommendations, setRecommendations] = useState<PriorityRecommendation[]>([]);
  const [rules, setRules] = useState<PriorityOptimizationRule[]>([]);
  const [schedules, setSchedules] = useState<PriorityOptimizationSchedule[]>([]);
  const [history, setHistory] = useState<PriorityOptimizationHistory[]>([]);
  const [stats, setStats] = useState<PriorityOptimizationStats | null>(null);
  const [insights, setInsights] = useState<OptimizationInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PriorityOptimizationRule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<PriorityOptimizationSchedule | null>(null);

  // Form states
  const [ruleForm, setRuleForm] = useState<CreateOptimizationRuleRequest>({
    rule_name: '',
    rule_type: 'deadline_based' as RuleType,
    description: '',
    rule_config: {},
    weight: 1.0,
  });

  const [scheduleForm, setScheduleForm] = useState<CreateOptimizationScheduleRequest>({
    schedule_name: '',
    schedule_type: 'daily' as ScheduleType,
    schedule_time: '09:00',
    optimization_scope: 'all' as OptimizationScope,
    max_changes_per_run: 10,
    min_confidence_threshold: 0.7,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [
        recommendationsData,
        rulesData,
        schedulesData,
        historyData,
        statsData,
        insightsData
      ] = await Promise.all([
        priorityOptimizationService.getPriorityRecommendations(),
        priorityOptimizationService.getOptimizationRules(),
        priorityOptimizationService.getOptimizationSchedules(),
        priorityOptimizationService.getOptimizationHistory(20),
        priorityOptimizationService.getOptimizationStats(),
        priorityOptimizationService.getOptimizationInsights(),
      ]);
      
      setRecommendations(recommendationsData);
      setRules(rulesData);
      setSchedules(schedulesData);
      setHistory(historyData);
      setStats(statsData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load priority optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeTasks = async () => {
    setOptimizing(true);
    try {
      await priorityOptimizationService.optimizeTaskPriorities();
      await loadData(); // Reload to show new optimizations
    } catch (error) {
      console.error('Failed to optimize tasks:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const handleAcceptRecommendation = async (recommendation: PriorityRecommendation) => {
    try {
      // This would apply the recommendation by updating the task priority
      // For now, we'll simulate by removing it from recommendations
      setRecommendations(prev => prev.filter(r => r.task_id !== recommendation.task_id));
    } catch (error) {
      console.error('Failed to accept recommendation:', error);
    }
  };

  const handleRejectRecommendation = async (recommendation: PriorityRecommendation) => {
    try {
      // Remove from recommendations without applying
      setRecommendations(prev => prev.filter(r => r.task_id !== recommendation.task_id));
    } catch (error) {
      console.error('Failed to reject recommendation:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      await priorityOptimizationService.createOptimizationRule(ruleForm);
      setShowRuleDialog(false);
      setRuleForm({
        rule_name: '',
        rule_type: 'deadline_based' as RuleType,
        description: '',
        rule_config: {},
        weight: 1.0,
      });
      loadData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await priorityOptimizationService.createOptimizationSchedule(scheduleForm);
      setShowScheduleDialog(false);
      setScheduleForm({
        schedule_name: '',
        schedule_type: 'daily' as ScheduleType,
        schedule_time: '09:00',
        optimization_scope: 'all' as OptimizationScope,
        max_changes_per_run: 10,
        min_confidence_threshold: 0.7,
      });
      loadData();
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const handleToggleRule = async (rule: PriorityOptimizationRule) => {
    try {
      await priorityOptimizationService.updateOptimizationRule(rule.id, {
        is_active: !rule.is_active,
      });
      loadData();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleToggleSchedule = async (schedule: PriorityOptimizationSchedule) => {
    try {
      await priorityOptimizationService.updateOptimizationSchedule(schedule.id, {
        is_active: !schedule.is_active,
      });
      loadData();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
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

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRuleTypeIcon = (type: RuleType) => {
    switch (type) {
      case 'deadline_based': return <Clock className="h-4 w-4" />;
      case 'pattern_based': return <TrendingUp className="h-4 w-4" />;
      case 'context_based': return <Brain className="h-4 w-4" />;
      case 'dependency_based': return <Target className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
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
            <ArrowUpDown className="h-8 w-8 text-primary" />
            Smart Priority Optimization
          </h1>
          <p className="text-muted-foreground">
            AI-powered task priority management based on your patterns and deadlines
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleOptimizeTasks} 
            disabled={optimizing}
            className="flex items-center gap-2"
          >
            {optimizing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Optimize Now
          </Button>
          
          <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                New Rule
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                New Schedule
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
              <CardTitle className="text-sm font-medium">Total Optimizations</CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_optimizations}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.acceptance_rate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Optimizations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasks_optimized_today}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Improvement</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.average_score_improvement.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="rules">Optimization Rules</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Priority Recommendations</h3>
                <p className="text-muted-foreground mb-4">
                  Your task priorities are well-optimized, or click "Optimize Now" to generate new recommendations
                </p>
                <Button onClick={handleOptimizeTasks}>
                  Generate Recommendations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((recommendation) => (
                <Card key={recommendation.task_id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {recommendation.task_title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={getPriorityColor(recommendation.current_priority)}
                          >
                            Current: {recommendation.current_priority}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Badge 
                            variant="secondary" 
                            className={getPriorityColor(recommendation.recommended_priority)}
                          >
                            Recommended: {recommendation.recommended_priority}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`ml-2 ${getConfidenceColor(recommendation.confidence_score)}`}
                          >
                            {(recommendation.confidence_score * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 rounded p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className="h-3 w-3" />
                        <span className="font-medium">AI Reasoning</span>
                      </div>
                      <p className="text-muted-foreground">{recommendation.reasoning}</p>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium">Urgency</div>
                        <div className="text-muted-foreground">
                          {(recommendation.score_breakdown.urgency_score * 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Importance</div>
                        <div className="text-muted-foreground">
                          {(recommendation.score_breakdown.importance_score * 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Context</div>
                        <div className="text-muted-foreground">
                          {(recommendation.score_breakdown.context_score * 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Pattern</div>
                        <div className="text-muted-foreground">
                          {(recommendation.score_breakdown.pattern_score * 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">Dependencies</div>
                        <div className="text-muted-foreground">
                          {(recommendation.score_breakdown.dependency_score * 100).toFixed(0)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAcceptRecommendation(recommendation)}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRejectRecommendation(recommendation)}
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

        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getRuleTypeIcon(rule.rule_type)}
                        <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
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
                      <span className="font-medium">Weight:</span> {rule.weight}
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

        <TabsContent value="schedules" className="space-y-4">
          <div className="grid gap-4">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <CardTitle className="text-lg">{schedule.schedule_name}</CardTitle>
                        <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {schedule.schedule_type} optimization - {schedule.optimization_scope} tasks
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleSchedule(schedule)}
                    >
                      {schedule.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Schedule:</span>
                      <div>
                        {schedule.schedule_type === 'daily' && schedule.schedule_time 
                          ? `Daily at ${schedule.schedule_time}`
                          : schedule.schedule_type === 'hourly' 
                          ? 'Every hour'
                          : schedule.schedule_type}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Max Changes:</span>
                      <div>{schedule.max_changes_per_run} per run</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Confidence Threshold:</span>
                      <div>{(schedule.min_confidence_threshold * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Last Run:</span>
                      <div>
                        {schedule.last_run_at 
                          ? new Date(schedule.last_run_at).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4">
            {history.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getPriorityColor(entry.old_priority)}>
                          {entry.old_priority}
                        </Badge>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className={getPriorityColor(entry.new_priority)}>
                          {entry.new_priority}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`ml-2 ${getConfidenceColor(entry.confidence_score)}`}
                        >
                          {(entry.confidence_score * 100).toFixed(0)}%
                        </Badge>
                        {entry.user_accepted !== null && (
                          <Badge variant={entry.user_accepted ? 'default' : 'destructive'}>
                            {entry.user_accepted ? 'Accepted' : 'Rejected'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.reasoning || 'AI-powered priority optimization'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </div>
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
                    <Clock className="h-5 w-5" />
                    Peak Optimization Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.peak_optimization_hours.map((hour, index) => (
                      <div key={hour} className="flex items-center justify-between">
                        <span>{hour}</span>
                        <Badge variant="secondary">Peak #{index + 1}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Most Optimized Priorities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.most_optimized_priorities.map((priority, index) => (
                      <div key={priority} className="flex items-center justify-between">
                        <Badge variant="outline" className={getPriorityColor(priority)}>
                          {priority}
                        </Badge>
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Rule Effectiveness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(insights.rule_effectiveness).map(([rule, effectiveness]) => (
                      <div key={rule}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{rule}</span>
                          <span className="text-sm text-muted-foreground">
                            {(effectiveness * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${effectiveness * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Improvement Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights.improvement_suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="text-sm">{suggestion}</span>
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
                  Start using priority optimization to see personalized insights
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
            <DialogTitle>Create Optimization Rule</DialogTitle>
            <DialogDescription>
              Define how AI should optimize your task priorities
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
                  placeholder="e.g., Deadline Priority Boost"
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
                    <SelectItem value="deadline_based">Deadline Based</SelectItem>
                    <SelectItem value="pattern_based">Pattern Based</SelectItem>
                    <SelectItem value="context_based">Context Based</SelectItem>
                    <SelectItem value="dependency_based">Dependency Based</SelectItem>
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
                placeholder="Describe how this rule should work..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="rule-weight">Weight (0.0 - 1.0)</Label>
              <Input
                id="rule-weight"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={ruleForm.weight}
                onChange={(e) => setRuleForm(prev => ({ 
                  ...prev, 
                  weight: parseFloat(e.target.value) || 1.0 
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

      {/* Create Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Optimization Schedule</DialogTitle>
            <DialogDescription>
              Set up automatic priority optimization runs
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schedule-name">Schedule Name</Label>
                <Input
                  id="schedule-name"
                  value={scheduleForm.schedule_name}
                  onChange={(e) => setScheduleForm(prev => ({ 
                    ...prev, 
                    schedule_name: e.target.value 
                  }))}
                  placeholder="e.g., Daily Morning Optimization"
                />
              </div>
              
              <div>
                <Label htmlFor="schedule-type">Schedule Type</Label>
                <Select 
                  value={scheduleForm.schedule_type} 
                  onValueChange={(value) => setScheduleForm(prev => ({ 
                    ...prev, 
                    schedule_type: value as ScheduleType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {scheduleForm.schedule_type === 'daily' && (
              <div>
                <Label htmlFor="schedule-time">Time</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleForm.schedule_time}
                  onChange={(e) => setScheduleForm(prev => ({ 
                    ...prev, 
                    schedule_time: e.target.value 
                  }))}
                />
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="optimization-scope">Scope</Label>
                <Select 
                  value={scheduleForm.optimization_scope} 
                  onValueChange={(value) => setScheduleForm(prev => ({ 
                    ...prev, 
                    optimization_scope: value as OptimizationScope 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="max-changes">Max Changes</Label>
                <Input
                  id="max-changes"
                  type="number"
                  min="1"
                  max="50"
                  value={scheduleForm.max_changes_per_run}
                  onChange={(e) => setScheduleForm(prev => ({ 
                    ...prev, 
                    max_changes_per_run: parseInt(e.target.value) || 10 
                  }))}
                />
              </div>
              
              <div>
                <Label htmlFor="min-confidence">Min Confidence</Label>
                <Input
                  id="min-confidence"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={scheduleForm.min_confidence_threshold}
                  onChange={(e) => setScheduleForm(prev => ({ 
                    ...prev, 
                    min_confidence_threshold: parseFloat(e.target.value) || 0.7 
                  }))}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule}>
              Create Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}