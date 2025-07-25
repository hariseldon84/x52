// Epic 9, Story 9.5: Intelligent Goal Breakdown and Planning UI

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  Plus, 
  Brain, 
  CheckCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Lightbulb,
  Calendar,
  BarChart3,
  Zap,
  Star,
  ChevronRight,
  ArrowRight,
  FileText,
  BookOpen,
  Settings
} from 'lucide-react';

import { goalBreakdownService } from '@/lib/services/goalBreakdownService';
import type {
  GoalBreakdown,
  GoalBreakdownTemplate,
  BreakdownTask,
  Milestone,
  BreakdownStats,
  BreakdownInsights,
  UserSkillAssessment,
  BreakdownProgress,
  SmartBreakdownSuggestion,
  TemplateType,
  BreakdownStatus
} from '@/lib/types/goalBreakdown';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: string;
}

export default function GoalBreakdownPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [breakdowns, setBreakdowns] = useState<GoalBreakdown[]>([]);
  const [templates, setTemplates] = useState<GoalBreakdownTemplate[]>([]);
  const [skills, setSkills] = useState<UserSkillAssessment[]>([]);
  const [stats, setStats] = useState<BreakdownStats | null>(null);
  const [insights, setInsights] = useState<BreakdownInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<GoalBreakdown | null>(null);
  
  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [newBreakdownForm, setNewBreakdownForm] = useState({
    goal_id: '',
    goal_description: '',
    template_id: '',
    target_start_date: '',
    target_end_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [breakdownsData, templatesData, skillsData, statsData, insightsData] = await Promise.all([
        goalBreakdownService.getBreakdowns(),
        goalBreakdownService.getTemplates(),
        goalBreakdownService.getSkillAssessments(),
        goalBreakdownService.getBreakdownStats(),
        goalBreakdownService.getComprehensiveInsights()
      ]);

      setBreakdowns(breakdownsData);
      setTemplates(templatesData);
      setSkills(skillsData);
      setStats(statsData);
      setInsights(insightsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBreakdown = async () => {
    if (!newBreakdownForm.goal_description.trim()) return;

    try {
      setIsCreating(true);
      
      // For demo purposes, create a mock goal_id
      const mockGoalId = 'goal_' + Date.now();
      
      const breakdown = await goalBreakdownService.createBreakdown({
        goal_id: mockGoalId,
        goal_description: newBreakdownForm.goal_description,
        template_id: newBreakdownForm.template_id || undefined,
        target_start_date: newBreakdownForm.target_start_date || undefined,
        target_end_date: newBreakdownForm.target_end_date || undefined
      });

      setBreakdowns(prev => [breakdown, ...prev]);
      setNewBreakdownForm({
        goal_id: '',
        goal_description: '',
        template_id: '',
        target_start_date: '',
        target_end_date: ''
      });
      
      // Switch to the breakdown details
      setSelectedBreakdown(breakdown);
      setActiveTab('breakdowns');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create breakdown');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: BreakdownStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'approved': return 'bg-purple-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplexityColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goal Breakdown & Planning</h1>
          <p className="text-gray-600 mt-1">AI-powered goal decomposition into actionable tasks</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <Brain className="w-4 h-4 mr-2" />
              Create Breakdown
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Goal Breakdown</DialogTitle>
              <DialogDescription>
                Describe your goal and let AI break it down into actionable tasks with timeline and milestones.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-description">Goal Description</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Describe your goal in detail... (e.g., 'Build a full-stack web application for task management with user authentication, real-time updates, and mobile responsiveness')"
                  value={newBreakdownForm.goal_description}
                  onChange={(e) => setNewBreakdownForm(prev => ({ ...prev, goal_description: e.target.value }))}
                  className="min-h-[100px] mt-1"
                />
              </div>
              <div>
                <Label htmlFor="template">Template (Optional)</Label>
                <Select 
                  value={newBreakdownForm.template_id} 
                  onValueChange={(value) => setNewBreakdownForm(prev => ({ ...prev, template_id: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a template or let AI decide" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{template.template_type}</Badge>
                          <span>{template.template_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Target Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={newBreakdownForm.target_start_date}
                    onChange={(e) => setNewBreakdownForm(prev => ({ ...prev, target_start_date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">Target End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={newBreakdownForm.target_end_date}
                    onChange={(e) => setNewBreakdownForm(prev => ({ ...prev, target_end_date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateBreakdown} 
                disabled={isCreating || !newBreakdownForm.goal_description.trim()}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing Goal...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Create AI Breakdown
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Breakdowns</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_breakdowns || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.completed_breakdowns || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((stats?.success_rate || 0) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Goal completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stats?.average_completion_time || 0)}d
                </div>
                <p className="text-xs text-muted-foreground">
                  Average days to complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Skills to Develop</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.skill_improvement_areas.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  High priority skills
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Breakdowns</CardTitle>
                <CardDescription>Your latest goal breakdowns and their progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {breakdowns.slice(0, 3).map((breakdown) => (
                  <div key={breakdown.id} className="flex items-center space-x-4 p-3 rounded-lg border bg-gray-50">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(breakdown.status)}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{breakdown.goal_description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {breakdown.status}
                        </Badge>
                        <span className={`text-xs font-medium ${getComplexityColor(breakdown.goal_complexity_score)}`}>
                          Complexity: {Math.round(breakdown.goal_complexity_score * 100)}%
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedBreakdown(breakdown);
                        setActiveTab('breakdowns');
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {breakdowns.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No goal breakdowns yet. Create your first one!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>Personalized recommendations for better goal planning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights?.personalized_recommendations.slice(0, 3).map((recommendation, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-blue-50">
                    <div className="flex items-start space-x-3">
                      <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-blue-900">{recommendation.title}</h4>
                        <p className="text-xs text-blue-700 mt-1">{recommendation.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {recommendation.impact} impact
                          </Badge>
                          <span className="text-xs text-blue-600">
                            {Math.round(recommendation.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdowns" className="space-y-6">
          {selectedBreakdown ? (
            <BreakdownDetails 
              breakdown={selectedBreakdown} 
              onBack={() => setSelectedBreakdown(null)}
              onUpdate={loadData}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Goal Breakdowns</h3>
                <div className="flex items-center space-x-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {breakdowns.map((breakdown) => (
                  <Card key={breakdown.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 line-clamp-2">
                            {breakdown.goal_description}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={getStatusColor(breakdown.status)}>
                              {breakdown.status}
                            </Badge>
                            <Badge variant="outline">
                              {breakdown.estimated_duration_days}d estimated
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Complexity Score</span>
                            <span className={getComplexityColor(breakdown.goal_complexity_score)}>
                              {Math.round(breakdown.goal_complexity_score * 100)}%
                            </span>
                          </div>
                          <Progress value={breakdown.goal_complexity_score * 100} className="h-2" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{Math.round(breakdown.progress_percentage)}%</span>
                          </div>
                          <Progress value={breakdown.progress_percentage} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Phases: {breakdown.suggested_phases?.length || 0}</span>
                          <span>Tasks: {breakdown.suggested_tasks?.length || 0}</span>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setSelectedBreakdown(breakdown)}
                        >
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {breakdowns.length === 0 && (
                <Card className="py-12">
                  <CardContent className="text-center">
                    <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">No Goal Breakdowns Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start by creating your first AI-powered goal breakdown to turn complex objectives into actionable tasks.
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Breakdown
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goal Breakdown Templates</CardTitle>
              <CardDescription>
                Pre-built templates to help structure different types of goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="border-2 hover:border-blue-300 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{template.template_type}</Badge>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">{template.success_rate.toFixed(1)}</span>
                        </div>
                      </div>
                      <CardTitle className="text-base">{template.template_name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">
                          Used {template.usage_count} times
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.default_phases?.length || 0} phases • {template.common_tasks?.length || 0} common tasks
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Assessment</CardTitle>
              <CardDescription>
                Your current skill levels and areas for improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium">{skill.skill_name}</h4>
                        <Badge variant="outline">{skill.skill_category}</Badge>
                        {skill.improvement_priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">High Priority</Badge>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Current Level</span>
                          <span>{skill.current_level}/5</span>
                        </div>
                        <Progress value={(skill.current_level / 5) * 100} className="h-2" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {skills.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No skill assessments yet. They'll be created automatically as you complete tasks.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {insights && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Time Estimation Accuracy</CardTitle>
                  <CardDescription>How accurate are your time estimates?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Average Variance</span>
                      <Badge variant="outline">
                        {Math.round(insights.time_estimation_accuracy.average_variance * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Trend</span>
                      <Badge variant={insights.time_estimation_accuracy.improvement_trend === 'improving' ? 'default' : 'secondary'}>
                        {insights.time_estimation_accuracy.improvement_trend}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {insights.time_estimation_accuracy.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <ChevronRight className="w-4 h-4 mr-1 mt-0.5 text-blue-600" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skill Gap Analysis</CardTitle>
                  <CardDescription>Skills you need to develop for better goal achievement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.skill_gap_analysis.identified_gaps.map((gap, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{gap.skill}</h4>
                          <Badge variant="outline">
                            {gap.current_level} → {gap.required_level}
                          </Badge>
                        </div>
                        <div className="mb-2">
                          <Progress value={(gap.current_level / gap.required_level) * 100} className="h-2" />
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Learning Resources: </span>
                          {gap.learning_resources.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Success Factor Analysis</CardTitle>
                  <CardDescription>What contributes to your goal success?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Key Success Factors</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {insights.success_factor_analysis.key_success_factors.map((factor, index) => (
                        <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                          <p className="text-sm font-medium text-green-800">{factor}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Risk Mitigation Strategies</h4>
                    <div className="space-y-2">
                      {insights.success_factor_analysis.risk_mitigation_strategies.map((strategy, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <p className="text-sm text-gray-700">{strategy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round((stats?.success_rate || 0) * 100)}%</div>
                <Progress value={(stats?.success_rate || 0) * 100} className="mt-2 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Timeline</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(stats?.average_completion_time || 0)}d</div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs. estimated timeline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {breakdowns.filter(b => b.status === 'in_progress').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates Used</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available templates
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Breakdown Performance</CardTitle>
              <CardDescription>Analysis of your goal breakdown patterns and outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Template Success Rates</h4>
                  <div className="space-y-3">
                    {templates.slice(0, 5).map((template, index) => (
                      <div key={template.id} className="flex items-center space-x-4">
                        <div className="w-32 text-sm font-medium truncate">
                          {template.template_name}
                        </div>
                        <div className="flex-1">
                          <Progress value={template.success_rate * 100} className="h-2" />
                        </div>
                        <div className="w-16 text-sm text-right">
                          {Math.round(template.success_rate * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Most Common Challenge Areas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h5 className="font-medium text-yellow-800 mb-2">Time Estimation</h5>
                      <p className="text-sm text-yellow-700">
                        Projects often take 25% longer than estimated. Consider adding buffer time.
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-2">Skill Development</h5>
                      <p className="text-sm text-blue-700">
                        Plan dedicated time for learning new skills required for your goals.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Breakdown Details Component
function BreakdownDetails({ 
  breakdown, 
  onBack, 
  onUpdate 
}: { 
  breakdown: GoalBreakdown; 
  onBack: () => void;
  onUpdate: () => void;
}) {
  const [tasks, setTasks] = useState<BreakdownTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<BreakdownProgress | null>(null);
  const [suggestions, setSuggestions] = useState<SmartBreakdownSuggestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBreakdownDetails();
  }, [breakdown.id]);

  const loadBreakdownDetails = async () => {
    try {
      setLoading(true);
      const [tasksData, milestonesData, progressData, suggestionsData] = await Promise.all([
        goalBreakdownService.getBreakdownTasks(breakdown.id),
        goalBreakdownService.getMilestones(breakdown.id),
        goalBreakdownService.getBreakdownProgress(breakdown.id),
        goalBreakdownService.getSmartSuggestions(breakdown.id)
      ]);

      setTasks(tasksData);
      setMilestones(milestonesData);
      setProgress(progressData);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Failed to load breakdown details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTasks = async (selectedTaskIds: string[]) => {
    try {
      await goalBreakdownService.createTaskBatch({
        breakdown_id: breakdown.id,
        selected_task_ids: selectedTaskIds
      });
      await loadBreakdownDetails();
      onUpdate();
    } catch (error) {
      console.error('Failed to create tasks:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={onBack} size="sm">
          ← Back to Breakdowns
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold line-clamp-2">{breakdown.goal_description}</h2>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline">{breakdown.status}</Badge>
            <Badge variant="outline">
              Complexity: {Math.round(breakdown.goal_complexity_score * 100)}%
            </Badge>
            {breakdown.estimated_duration_days && (
              <Badge variant="outline">
                {breakdown.estimated_duration_days} days estimated
              </Badge>
            )}
          </div>
        </div>
      </div>

      {suggestions && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-blue-900">Smart Suggestions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Success Probability</span>
                <span className="text-blue-900 font-semibold">
                  {Math.round(suggestions.estimated_success_probability * 100)}%
                </span>
              </div>
              <Progress value={suggestions.estimated_success_probability * 100} className="h-2" />
            </div>
            <div>
              <p className="text-sm text-blue-800 mb-3">{suggestions.reasoning}</p>
              {suggestions.recommended_adjustments.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">Recommended Adjustments</h4>
                  <div className="space-y-2">
                    {suggestions.recommended_adjustments.map((adjustment, index) => (
                      <div key={index} className="text-sm text-blue-700">
                        <span className="font-medium">{adjustment.area}:</span> {adjustment.impact}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tasks">Tasks & Phases</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Tasks</CardTitle>
                  <CardDescription>AI-generated tasks organized by phases</CardDescription>
                </div>
                <Button onClick={() => handleCreateTasks(tasks.map(t => t.id))}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create All Tasks
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Array.from(new Set(tasks.map(t => t.phase_number))).map(phaseNumber => {
                  const phaseTasks = tasks.filter(t => t.phase_number === phaseNumber);
                  const phaseInfo = breakdown.suggested_phases?.[phaseNumber - 1];
                  
                  return (
                    <div key={phaseNumber} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">
                            Phase {phaseNumber}: {phaseInfo?.name || `Phase ${phaseNumber}`}
                          </h3>
                          {phaseInfo?.description && (
                            <p className="text-sm text-gray-600 mt-1">{phaseInfo.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {phaseTasks.length} tasks
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        {phaseTasks.map((task) => (
                          <div key={task.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-sm">{task.task_title}</h4>
                                <Badge variant="outline" size="sm">{task.complexity_level}</Badge>
                                <Badge variant="outline" size="sm">{task.estimated_hours}h</Badge>
                              </div>
                              {task.task_description && (
                                <p className="text-sm text-gray-600 mb-2">{task.task_description}</p>
                              )}
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Confidence: {Math.round(task.confidence_score * 100)}%</span>
                                <span>Priority: {task.priority_level}</span>
                                {task.required_skills.length > 0 && (
                                  <span>Skills: {task.required_skills.join(', ')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.is_created_as_task ? (
                                <Badge variant="default">Created</Badge>
                              ) : (
                                <Button 
                                  variant={task.is_approved ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleCreateTasks([task.id])}
                                >
                                  {task.is_approved ? "Create Task" : "Approve & Create"}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Milestones</CardTitle>
              <CardDescription>Key checkpoints and deliverables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <div 
                    key={milestone.id} 
                    className={`p-4 border rounded-lg ${milestone.is_achieved ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium flex items-center space-x-2">
                        {milestone.is_achieved ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                        )}
                        <span>{milestone.milestone_name}</span>
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{milestone.milestone_type}</Badge>
                        {milestone.target_date && (
                          <Badge variant="outline">
                            {new Date(milestone.target_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {milestone.milestone_description && (
                      <p className="text-sm text-gray-600 mb-3">{milestone.milestone_description}</p>
                    )}
                    {milestone.success_criteria.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Success Criteria:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {milestone.success_criteria.map((criteria, index) => (
                            <li key={index} className="flex items-start">
                              <ChevronRight className="w-4 h-4 mr-1 mt-0.5" />
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          {progress && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Overall Progress</CardTitle>
                  <CardDescription>Your progress across all phases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Overall Completion</span>
                        <span className="font-semibold">{Math.round(progress.overall_progress)}%</span>
                      </div>
                      <Progress value={progress.overall_progress} className="h-3" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {progress.phase_progress.map((phase, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{phase.phase_name}</h4>
                            <Badge variant={phase.on_schedule ? "default" : "destructive"}>
                              {phase.on_schedule ? "On Track" : "Behind"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{Math.round(phase.completion_percentage)}%</span>
                          </div>
                          <Progress value={phase.completion_percentage} className="h-2 mb-2" />
                          <div className="text-xs text-gray-600">
                            {phase.tasks_completed} of {phase.tasks_total} tasks completed
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {progress.current_bottlenecks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span>Current Bottlenecks</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {progress.current_bottlenecks.map((bottleneck, index) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <p className="text-sm text-yellow-800">{bottleneck}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {progress.recommended_actions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                        <p className="text-sm text-blue-800">{action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
              <CardDescription>Detailed breakdown analysis and insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Complexity Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-gray-600">Overall Complexity</div>
                    <div className="text-lg font-semibold">
                      {Math.round(breakdown.goal_complexity_score * 100)}%
                    </div>
                    <Progress value={breakdown.goal_complexity_score * 100} className="h-2 mt-1" />
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-gray-600">Confidence Level</div>
                    <div className="text-lg font-semibold">
                      {Math.round(breakdown.breakdown_analysis.confidence_level * 100)}%
                    </div>
                    <Progress value={breakdown.breakdown_analysis.confidence_level * 100} className="h-2 mt-1" />
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm text-gray-600">Estimated Duration</div>
                    <div className="text-lg font-semibold">
                      {breakdown.estimated_duration_days} days
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {breakdown.breakdown_analysis.required_skills?.map((skill, index) => (
                    <Badge key={index} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Success Factors</h4>
                  <div className="space-y-2">
                    {breakdown.breakdown_analysis.success_factors?.map((factor, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <p className="text-sm text-gray-700">{factor}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Risk Factors</h4>
                  <div className="space-y-2">
                    {breakdown.breakdown_analysis.risk_factors?.map((risk, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <p className="text-sm text-gray-700">{risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}