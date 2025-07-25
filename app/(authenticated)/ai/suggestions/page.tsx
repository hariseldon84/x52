'use client';

// Epic 9, Story 9.1: AI Task Suggestions Page

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
  Lightbulb, 
  Check, 
  X, 
  Clock, 
  Star, 
  TrendingUp, 
  Brain,
  Settings,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Target,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { aiService } from '@/lib/services/aiService';
import type { 
  AITaskSuggestion,
  UserAIPreferences,
  AIStats,
  SuggestionInsights,
  GenerateSuggestionsRequest,
  AcceptSuggestionRequest,
  RejectSuggestionRequest,
  UpdateAIPreferencesRequest
} from '@/lib/types/ai';

export default function AISuggestionsPage() {
  const [suggestions, setSuggestions] = useState<AITaskSuggestion[]>([]);
  const [preferences, setPreferences] = useState<UserAIPreferences | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [insights, setInsights] = useState<SuggestionInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AITaskSuggestion | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Form states
  const [taskModifications, setTaskModifications] = useState({
    title: '',
    description: '',
    priority: '',
    complexity: '',
    due_date: '',
  });
  const [rejectReason, setRejectReason] = useState<string>('not_relevant');
  const [rejectFeedback, setRejectFeedback] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [suggestionsData, preferencesData, statsData, insightsData] = await Promise.all([
        aiService.getPendingSuggestions(),
        aiService.getUserPreferences(),
        aiService.getAIStats(),
        aiService.getSuggestionInsights(),
      ]);
      
      setSuggestions(suggestionsData);
      setPreferences(preferencesData);
      setStats(statsData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSuggestions = async (type?: string) => {
    setGenerating(true);
    try {
      const request: GenerateSuggestionsRequest = {
        suggestion_type: type as any,
        limit: 5,
      };
      
      await aiService.generateSuggestions(request);
      await loadData(); // Reload to get new suggestions
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptSuggestion = (suggestion: AITaskSuggestion) => {
    setSelectedSuggestion(suggestion);
    setTaskModifications({
      title: suggestion.suggested_title,
      description: suggestion.suggested_description || '',
      priority: suggestion.suggested_priority,
      complexity: suggestion.suggested_complexity,
      due_date: suggestion.suggested_due_date ? 
        new Date(suggestion.suggested_due_date).toISOString().split('T')[0] : '',
    });
    setShowAcceptDialog(true);
  };

  const handleRejectSuggestion = (suggestion: AITaskSuggestion) => {
    setSelectedSuggestion(suggestion);
    setRejectReason('not_relevant');
    setRejectFeedback('');
    setShowRejectDialog(true);
  };

  const confirmAcceptSuggestion = async () => {
    if (!selectedSuggestion) return;

    try {
      const request: AcceptSuggestionRequest = {
        suggestion_id: selectedSuggestion.id,
        modifications: Object.keys(taskModifications).reduce((acc, key) => {
          const value = taskModifications[key as keyof typeof taskModifications];
          if (value && value !== selectedSuggestion[`suggested_${key}` as keyof AITaskSuggestion]) {
            acc[key as keyof AcceptSuggestionRequest['modifications']] = value;
          }
          return acc;
        }, {} as any),
      };

      await aiService.acceptSuggestion(request);
      setShowAcceptDialog(false);
      setSelectedSuggestion(null);
      loadData();
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  const confirmRejectSuggestion = async () => {
    if (!selectedSuggestion) return;

    try {
      const request: RejectSuggestionRequest = {
        suggestion_id: selectedSuggestion.id,
        feedback_reason: rejectReason as any,
        feedback_text: rejectFeedback || undefined,
      };

      await aiService.rejectSuggestion(request);
      setShowRejectDialog(false);
      setSelectedSuggestion(null);
      loadData();
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    try {
      await aiService.dismissSuggestion(suggestionId);
      loadData();
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const handleProvideFeedback = async (
    suggestionId: string, 
    feedback: 'helpful' | 'not_helpful' | 'irrelevant'
  ) => {
    try {
      await aiService.provideFeedback(suggestionId, feedback);
      loadData();
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  };

  const updatePreferences = async (updates: UpdateAIPreferencesRequest) => {
    try {
      const updatedPrefs = await aiService.updateUserPreferences(updates);
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case 'similar_task': return <Target className="h-4 w-4" />;
      case 'follow_up': return <RefreshCw className="h-4 w-4" />;
      case 'pattern_based': return <TrendingUp className="h-4 w-4" />;
      case 'context_aware': return <Brain className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
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
            <Sparkles className="h-8 w-8 text-primary" />
            AI Task Suggestions
          </h1>
          <p className="text-muted-foreground">
            Let AI help you discover relevant tasks and optimize your productivity
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => handleGenerateSuggestions()} 
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Lightbulb className="h-4 w-4" />
            )}
            Generate Suggestions
          </Button>
          
          <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>AI Preferences</DialogTitle>
                <DialogDescription>
                  Customize how AI suggestions work for you
                </DialogDescription>
              </DialogHeader>
              
              {preferences && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable-suggestions"
                      checked={preferences.enable_ai_suggestions}
                      onChange={(e) => updatePreferences({ 
                        enable_ai_suggestions: e.target.checked 
                      })}
                    />
                    <Label htmlFor="enable-suggestions">Enable AI suggestions</Label>
                  </div>
                  
                  <div>
                    <Label htmlFor="frequency">Suggestion frequency</Label>
                    <Select 
                      value={preferences.suggestion_frequency} 
                      onValueChange={(value) => updatePreferences({ 
                        suggestion_frequency: value as any 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="frequent">Frequent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="priority-optimization"
                      checked={preferences.enable_priority_optimization}
                      onChange={(e) => updatePreferences({ 
                        enable_priority_optimization: e.target.checked 
                      })}
                    />
                    <Label htmlFor="priority-optimization">Enable priority optimization</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="behavior-tracking"
                      checked={preferences.allow_behavior_tracking}
                      onChange={(e) => updatePreferences({ 
                        allow_behavior_tracking: e.target.checked 
                      })}
                    />
                    <Label htmlFor="behavior-tracking">Allow behavior tracking for better suggestions</Label>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suggestions</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_suggestions_generated}</div>
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
              <CardTitle className="text-sm font-medium">Tasks Created</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasks_created_from_ai}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patterns Detected</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.behavior_patterns_detected}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="suggestions">Active Suggestions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="generate">Generate More</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Suggestions</h3>
                <p className="text-muted-foreground mb-4">
                  Generate some AI suggestions to see intelligent task recommendations
                </p>
                <Button onClick={() => handleGenerateSuggestions()}>
                  Generate Suggestions
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSuggestionTypeIcon(suggestion.suggestion_type)}
                          <Badge variant="outline" className="text-xs">
                            {suggestion.suggestion_type.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getConfidenceColor(suggestion.confidence_score)}`}
                          >
                            {(suggestion.confidence_score * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">
                          {suggestion.suggested_title}
                        </CardTitle>
                        {suggestion.suggested_description && (
                          <CardDescription className="mt-1">
                            {suggestion.suggested_description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{suggestion.suggested_priority}</Badge>
                        <span>Priority</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{suggestion.suggested_complexity}</Badge>
                        <span>Complexity</span>
                      </div>
                      {suggestion.suggested_due_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(suggestion.suggested_due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {suggestion.reasoning && (
                      <div className="bg-muted/50 rounded p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="h-3 w-3" />
                          <span className="font-medium">AI Reasoning</span>
                        </div>
                        <p className="text-muted-foreground">{suggestion.reasoning}</p>
                      </div>
                    )}
                    
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
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDismissSuggestion(suggestion.id)}
                      >
                        Dismiss
                      </Button>
                      
                      <div className="ml-auto flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleProvideFeedback(suggestion.id, 'helpful')}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleProvideFeedback(suggestion.id, 'not_helpful')}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
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
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Most Accepted Type</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getSuggestionTypeIcon(insights.most_accepted_type)}
                      <span className="font-medium capitalize">
                        {insights.most_accepted_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Best Time</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{insights.best_performing_time}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-muted-foreground">Average Response Time</Label>
                    <div className="font-medium">
                      {insights.average_response_time < 3600
                        ? `${Math.round(insights.average_response_time / 60)} minutes`
                        : `${Math.round(insights.average_response_time / 3600)} hours`}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Feedback Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(insights.feedback_distribution).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Recommendations
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
                  Start using AI suggestions to see personalized insights
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleGenerateSuggestions('similar_task')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Similar Tasks
                </CardTitle>
                <CardDescription>
                  Get suggestions based on your recently completed tasks
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleGenerateSuggestions('follow_up')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Follow-ups
                </CardTitle>
                <CardDescription>
                  Discover logical next steps from your current work
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleGenerateSuggestions('pattern_based')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Pattern-Based
                </CardTitle>
                <CardDescription>
                  Suggestions based on your productivity patterns
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleGenerateSuggestions('time_based')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time-Based
                </CardTitle>
                <CardDescription>
                  Suggestions optimized for your current time and schedule
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleGenerateSuggestions('context_aware')}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Context-Aware
                </CardTitle>
                <CardDescription>
                  Smart suggestions based on your current context
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Accept Suggestion Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Accept Suggestion</DialogTitle>
            <DialogDescription>
              Review and modify the task details before creating
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={taskModifications.title}
                onChange={(e) => setTaskModifications(prev => ({ 
                  ...prev, 
                  title: e.target.value 
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskModifications.description}
                onChange={(e) => setTaskModifications(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select 
                  value={taskModifications.priority} 
                  onValueChange={(value) => setTaskModifications(prev => ({ 
                    ...prev, 
                    priority: value 
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
              
              <div>
                <Label htmlFor="task-complexity">Complexity</Label>
                <Select 
                  value={taskModifications.complexity} 
                  onValueChange={(value) => setTaskModifications(prev => ({ 
                    ...prev, 
                    complexity: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskModifications.due_date}
                onChange={(e) => setTaskModifications(prev => ({ 
                  ...prev, 
                  due_date: e.target.value 
                }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAcceptSuggestion}>
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Suggestion Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Suggestion</DialogTitle>
            <DialogDescription>
              Help us improve by telling us why this suggestion wasn't helpful
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_relevant">Not relevant</SelectItem>
                  <SelectItem value="too_similar">Too similar to existing tasks</SelectItem>
                  <SelectItem value="wrong_timing">Wrong timing</SelectItem>
                  <SelectItem value="incorrect_details">Incorrect details</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="reject-feedback">Additional feedback (optional)</Label>
              <Textarea
                id="reject-feedback"
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                placeholder="Tell us more about why this suggestion wasn't helpful..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRejectSuggestion}>
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}