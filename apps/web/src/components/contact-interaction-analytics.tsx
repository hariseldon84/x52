'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, MessageCircle, Calendar, Phone, Mail, Video,
  TrendingUp, TrendingDown, Clock, Target, Star, Award,
  BarChart3, PieChart, Activity, Eye, CheckCircle, 
  ArrowRight, User, Building, Heart, Briefcase,
  Network, Zap, Timer, AlertCircle, Plus, Filter
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO, subDays, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

type Contact = Database['public']['Tables']['contacts']['Row'];

interface ContactAnalytics {
  contact: Contact;
  totalInteractions: number;
  recentInteractions: number;
  lastInteractionDate: string | null;
  daysSinceLastContact: number;
  interactionFrequency: number; // interactions per month
  relationshipStrength: 'strong' | 'moderate' | 'weak' | 'dormant';
  interactionTypes: {
    email: number;
    phone: number;
    meeting: number;
    social: number;
    other: number;
  };
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
  };
  insights: string[];
  recommendations: string[];
}

interface NetworkMetrics {
  totalContacts: number;
  activeContacts: number; // contacted in last 30 days
  dormantContacts: number; // not contacted in 90+ days
  averageInteractionFrequency: number;
  strongRelationships: number;
  networking_score: number;
  categoryDistribution: { [key: string]: number };
  priorityDistribution: { [key: string]: number };
}

interface InteractionPattern {
  type: 'email' | 'phone' | 'meeting' | 'social' | 'other';
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  averageInterval: number; // days between interactions
}

interface ContactInteractionAnalyticsProps {
  className?: string;
}

const getRelationshipColor = (strength: string) => {
  switch (strength) {
    case 'strong': return 'text-green-600 bg-green-50 border-green-200';
    case 'moderate': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'weak': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'dormant': return 'text-gray-600 bg-gray-50 border-gray-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getInteractionIcon = (type: string) => {
  switch (type) {
    case 'email': return Mail;
    case 'phone': return Phone;
    case 'meeting': return Video;
    case 'social': return Users;
    default: return MessageCircle;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'professional': return Briefcase;
    case 'personal': return Heart;
    case 'vendor': return Building;
    case 'client': return Target;
    default: return User;
  }
};

export function ContactInteractionAnalytics({ className = '' }: ContactInteractionAnalyticsProps) {
  const [contactAnalytics, setContactAnalytics] = useState<ContactAnalytics[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [interactionPatterns, setInteractionPatterns] = useState<InteractionPattern[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const analyzeContactInteractions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      const ninetyDaysAgo = subDays(today, 90);

      // Get all contacts with their interaction data
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_interactions(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;

      if (!contacts || contacts.length === 0) {
        setContactAnalytics([]);
        setNetworkMetrics({
          totalContacts: 0,
          activeContacts: 0,
          dormantContacts: 0,
          averageInteractionFrequency: 0,
          strongRelationships: 0,
          networking_score: 0,
          categoryDistribution: {},
          priorityDistribution: {},
        });
        setInteractionPatterns([]);
        return;
      }

      // Analyze each contact
      const analyzedContacts: ContactAnalytics[] = [];
      const categoryStats: { [key: string]: number } = {};
      const priorityStats: { [key: string]: number } = {};
      const interactionTypeStats: { [key: string]: number } = {};

      let activeContacts = 0;
      let dormantContacts = 0;
      let strongRelationships = 0;
      let totalInteractionFrequency = 0;

      for (const contact of contacts) {
        const interactions = contact.contact_interactions || [];
        const totalInteractions = interactions.length;
        
        // Filter recent interactions (last 30 days)
        const recentInteractions = interactions.filter(i => 
          parseISO(i.interaction_date) >= thirtyDaysAgo
        ).length;

        // Find last interaction
        const sortedInteractions = interactions
          .sort((a, b) => parseISO(b.interaction_date).getTime() - parseISO(a.interaction_date).getTime());
        
        const lastInteraction = sortedInteractions[0];
        const lastInteractionDate = lastInteraction?.interaction_date || null;
        const daysSinceLastContact = lastInteractionDate 
          ? differenceInDays(today, parseISO(lastInteractionDate))
          : 999;

        // Calculate interaction frequency (per month)
        const contactAge = differenceInDays(today, parseISO(contact.created_at));
        const monthsSinceCreated = Math.max(1, contactAge / 30);
        const interactionFrequency = totalInteractions / monthsSinceCreated;

        // Determine relationship strength
        let relationshipStrength: ContactAnalytics['relationshipStrength'] = 'dormant';
        if (daysSinceLastContact <= 30 && interactionFrequency >= 2) {
          relationshipStrength = 'strong';
          strongRelationships++;
        } else if (daysSinceLastContact <= 60 && interactionFrequency >= 1) {
          relationshipStrength = 'moderate';
        } else if (daysSinceLastContact <= 90) {
          relationshipStrength = 'weak';
        } else {
          dormantContacts++;
        }

        if (daysSinceLastContact <= 30) {
          activeContacts++;
        }

        // Count interaction types
        const interactionTypes = {
          email: interactions.filter(i => i.interaction_type === 'email').length,
          phone: interactions.filter(i => i.interaction_type === 'phone').length,
          meeting: interactions.filter(i => i.interaction_type === 'meeting').length,
          social: interactions.filter(i => i.interaction_type === 'social').length,
          other: interactions.filter(i => !['email', 'phone', 'meeting', 'social'].includes(i.interaction_type)).length,
        };

        // Update global interaction stats
        Object.entries(interactionTypes).forEach(([type, count]) => {
          interactionTypeStats[type] = (interactionTypeStats[type] || 0) + count;
        });

        // Calculate trends (last 30 days vs previous 30 days)
        const previousPeriodInteractions = interactions.filter(i => {
          const date = parseISO(i.interaction_date);
          return date >= subDays(thirtyDaysAgo, 30) && date < thirtyDaysAgo;
        }).length;

        const trendDirection = recentInteractions > previousPeriodInteractions ? 'increasing' :
                              recentInteractions < previousPeriodInteractions ? 'decreasing' : 'stable';
        const trendChange = previousPeriodInteractions > 0 
          ? ((recentInteractions - previousPeriodInteractions) / previousPeriodInteractions) * 100 
          : 0;

        // Generate insights
        const insights: string[] = [];
        const recommendations: string[] = [];

        if (relationshipStrength === 'strong') {
          insights.push(`Strong relationship with ${interactionFrequency.toFixed(1)} interactions per month`);
          insights.push(`Last contacted ${daysSinceLastContact} days ago`);
          recommendations.push('Continue regular communication');
          recommendations.push('Consider introducing them to relevant connections');
        } else if (relationshipStrength === 'dormant') {
          insights.push(`No contact for ${daysSinceLastContact} days`);
          recommendations.push('Schedule a catch-up conversation');
          recommendations.push('Send a thoughtful message or article');
          recommendations.push('Consider if this relationship should be maintained');
        } else if (daysSinceLastContact > 60) {
          insights.push(`Haven't connected in ${daysSinceLastContact} days`);
          recommendations.push('Reach out with a personal message');
          recommendations.push('Share relevant opportunities or content');
        }

        if (trendDirection === 'decreasing') {
          insights.push(`Interaction frequency declining by ${Math.abs(trendChange).toFixed(0)}%`);
          recommendations.push('Schedule more regular check-ins');
        } else if (trendDirection === 'increasing') {
          insights.push(`Interaction frequency increasing by ${trendChange.toFixed(0)}%`);
        }

        analyzedContacts.push({
          contact,
          totalInteractions,
          recentInteractions,
          lastInteractionDate,
          daysSinceLastContact,
          interactionFrequency,
          relationshipStrength,
          interactionTypes,
          trends: {
            direction: trendDirection,
            change: trendChange,
          },
          insights,
          recommendations,
        });

        // Update category and priority stats
        const category = contact.category || 'other';
        const priority = contact.priority || 'medium';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
        priorityStats[priority] = (priorityStats[priority] || 0) + 1;
        totalInteractionFrequency += interactionFrequency;
      }

      // Calculate network metrics
      const averageInteractionFrequency = totalInteractionFrequency / contacts.length;
      const networking_score = Math.min(100, 
        (activeContacts / contacts.length) * 40 + 
        (strongRelationships / contacts.length) * 35 + 
        Math.min(25, averageInteractionFrequency * 5)
      );

      const networkMetrics: NetworkMetrics = {
        totalContacts: contacts.length,
        activeContacts,
        dormantContacts,
        averageInteractionFrequency,
        strongRelationships,
        networking_score,
        categoryDistribution: categoryStats,
        priorityDistribution: priorityStats,
      };

      // Calculate interaction patterns
      const totalInteractions = Object.values(interactionTypeStats).reduce((sum, count) => sum + count, 0);
      const patterns: InteractionPattern[] = Object.entries(interactionTypeStats).map(([type, count]) => ({
        type: type as any,
        count,
        percentage: totalInteractions > 0 ? (count / totalInteractions) * 100 : 0,
        trend: 'stable' as const, // Could be calculated with historical data
        averageInterval: 30, // Could be calculated
      }));

      // Apply filters
      let filteredAnalytics = analyzedContacts;
      if (filterCategory !== 'all') {
        filteredAnalytics = filteredAnalytics.filter(a => a.contact.category === filterCategory);
      }
      if (filterPriority !== 'all') {
        filteredAnalytics = filteredAnalytics.filter(a => a.contact.priority === filterPriority);
      }

      // Sort by relationship strength and recent activity
      filteredAnalytics.sort((a, b) => {
        const strengthOrder = { strong: 0, moderate: 1, weak: 2, dormant: 3 };
        const aOrder = strengthOrder[a.relationshipStrength];
        const bOrder = strengthOrder[b.relationshipStrength];
        
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.daysSinceLastContact - b.daysSinceLastContact;
      });

      setContactAnalytics(filteredAnalytics);
      setNetworkMetrics(networkMetrics);
      setInteractionPatterns(patterns);

    } catch (err: any) {
      console.error('Error analyzing contact interactions:', err);
      setError(err.message || 'Failed to analyze contact interactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    analyzeContactInteractions();
  }, [filterCategory, filterPriority]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Analyzing contact interactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={analyzeContactInteractions} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!networkMetrics || contactAnalytics.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600 text-sm mb-4">
              Add contacts and track interactions to see networking analytics.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Contact Interaction Analytics</h2>
            <p className="text-gray-600">Analyze your networking patterns and relationship health</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold text-blue-600">{networkMetrics.totalContacts}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {networkMetrics.activeContacts} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Network Score</p>
                <p className="text-2xl font-bold text-green-600">{networkMetrics.networking_score.toFixed(0)}</p>
              </div>
              <Network className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Overall networking health
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Strong Relationships</p>
                <p className="text-2xl font-bold text-purple-600">{networkMetrics.strongRelationships}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Regular, active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dormant Contacts</p>
                <p className="text-2xl font-bold text-orange-600">{networkMetrics.dormantContacts}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Need re-engagement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interaction Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Interaction Patterns</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {interactionPatterns.map((pattern) => {
              const IconComponent = getInteractionIcon(pattern.type);
              return (
                <div key={pattern.type} className="text-center p-4 bg-gray-50 rounded-lg">
                  <IconComponent className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                  <p className="font-medium text-2xl text-gray-900">{pattern.count}</p>
                  <p className="text-xs text-gray-500 capitalize">{pattern.type}</p>
                  <p className="text-xs text-gray-400">{pattern.percentage.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Contact Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(networkMetrics.categoryDistribution).map(([category, count]) => {
                const percentage = (count / networkMetrics.totalContacts) * 100;
                const IconComponent = getCategoryIcon(category);
                return (
                  <div key={category} className="flex items-center space-x-3">
                    <IconComponent className="h-4 w-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{category}</span>
                        <span>{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Priority Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(networkMetrics.priorityDistribution).map(([priority, count]) => {
                const percentage = (count / networkMetrics.totalContacts) * 100;
                const color = priority === 'high' ? 'text-red-600' : 
                            priority === 'medium' ? 'text-yellow-600' : 'text-green-600';
                return (
                  <div key={priority} className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      priority === 'high' ? 'bg-red-500' :
                      priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{priority}</span>
                        <span>{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Contact Analysis */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Contact Relationship Analysis</h3>
        
        <div className="space-y-3">
          {contactAnalytics.slice(0, 10).map((analytics) => {
            const CategoryIcon = getCategoryIcon(analytics.contact.category || 'other');
            
            return (
              <Card key={analytics.contact.id} className={`border-l-4 ${getRelationshipColor(analytics.relationshipStrength)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <CategoryIcon className="h-5 w-5 text-gray-600 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{analytics.contact.name}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {analytics.relationshipStrength}
                          </Badge>
                          {analytics.contact.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-gray-600">Total Interactions</p>
                            <p className="font-medium">{analytics.totalInteractions}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Last Contact</p>
                            <p className="font-medium">
                              {analytics.daysSinceLastContact === 0 ? 'Today' :
                               analytics.daysSinceLastContact === 1 ? 'Yesterday' :
                               analytics.daysSinceLastContact < 30 ? `${analytics.daysSinceLastContact} days ago` :
                               analytics.daysSinceLastContact < 365 ? `${Math.round(analytics.daysSinceLastContact / 30)} months ago` :
                               '1+ years ago'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Frequency</p>
                            <p className="font-medium">{analytics.interactionFrequency.toFixed(1)}/month</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Recent Activity</p>
                            <p className="font-medium">{analytics.recentInteractions} this month</p>
                          </div>
                        </div>

                        {/* Interaction Types */}
                        <div className="flex items-center space-x-4 mb-3">
                          {Object.entries(analytics.interactionTypes)
                            .filter(([_, count]) => count > 0)
                            .map(([type, count]) => {
                              const IconComponent = getInteractionIcon(type);
                              return (
                                <div key={type} className="flex items-center space-x-1 text-xs text-gray-600">
                                  <IconComponent className="h-3 w-3" />
                                  <span>{count}</span>
                                </div>
                              );
                            })}
                        </div>

                        {/* Insights */}
                        {analytics.insights.length > 0 && (
                          <div className="mb-3">
                            <h5 className="font-medium text-sm mb-1 flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>Insights</span>
                            </h5>
                            <ul className="space-y-1">
                              {analytics.insights.slice(0, 2).map((insight, i) => (
                                <li key={i} className="text-xs text-gray-600 flex items-start space-x-2">
                                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {analytics.recommendations.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-1 flex items-center space-x-1">
                              <ArrowRight className="h-3 w-3" />
                              <span>Recommendations</span>
                            </h5>
                            <ul className="space-y-1">
                              {analytics.recommendations.slice(0, 2).map((rec, i) => (
                                <li key={i} className="text-xs text-gray-600 flex items-start space-x-2">
                                  <Star className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>{analytics.contact.category || 'Other'}</p>
                        <p>{analytics.contact.company}</p>
                        {analytics.lastInteractionDate && (
                          <p>Last: {format(parseISO(analytics.lastInteractionDate), 'MMM dd')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {contactAnalytics.length > 10 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Showing top 10 contacts. Total analyzed: {contactAnalytics.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}