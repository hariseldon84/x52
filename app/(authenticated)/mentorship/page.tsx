// Epic 7, Story 7.4: Mentorship Page

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, BookOpen, Target, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MentorCard } from '@/components/mentorship/MentorCard';
import { MentorshipRequestDialog } from '@/components/mentorship/MentorshipRequestDialog';
import { mentorshipService } from '@/lib/services/mentorshipService';
import type { MentorProfile, MentorshipRequest, MentorshipRelationship } from '@/lib/types/social';

const expertiseAreas = [
  'all',
  'Career Development',
  'Leadership',
  'Technical Skills',
  'Communication',
  'Time Management',
  'Personal Branding',
  'Entrepreneurship',
  'Project Management',
  'Work-Life Balance',
];

const experienceLevels = [
  'all',
  'beginner',
  'intermediate', 
  'advanced',
  'expert',
];

export default function MentorshipPage() {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [relationships, setRelationships] = useState<MentorshipRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadMentorshipData();
  }, [expertiseFilter, experienceFilter]);

  const loadMentorshipData = async () => {
    try {
      setIsLoading(true);
      
      const filters = {
        expertise_areas: expertiseFilter !== 'all' ? [expertiseFilter] : undefined,
        experience_level: experienceFilter !== 'all' ? experienceFilter : undefined,
        limit: 50,
      };

      const [mentorsData, requestsData, relationshipsData] = await Promise.all([
        mentorshipService.findMentors(filters),
        mentorshipService.getMentorshipRequests('sent'),
        mentorshipService.getMentorshipRelationships('mentee'),
      ]);

      setMentors(mentorsData);
      setRequests(requestsData);
      setRelationships(relationshipsData);
    } catch (error) {
      console.error('Error loading mentorship data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load mentorship data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestMentorship = (mentorId: string) => {
    const mentor = mentors.find(m => m.user_id === mentorId);
    if (mentor) {
      setSelectedMentor(mentor);
      setShowRequestDialog(true);
    }
  };

  const handleSubmitRequest = async (mentorId: string, message: string, goals: string[]) => {
    try {
      setActionLoading('request');
      await mentorshipService.sendMentorshipRequest(mentorId, message, goals);
      
      toast({
        title: 'Success',
        description: 'Mentorship request sent successfully!',
      });
      
      await loadMentorshipData();
    } catch (error) {
      console.error('Error sending mentorship request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send request.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessageMentor = (mentorId: string) => {
    // Navigate to chat/messaging with mentor
    toast({
      title: 'Coming Soon',
      description: 'Direct messaging feature will be available soon.',
    });
  };

  const filteredMentors = mentors.filter(mentor =>
    mentor.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.expertise_areas.some(area => 
      area.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const renderMentorGrid = (mentorList: MentorProfile[]) => {
    if (mentorList.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No mentors found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search criteria or filters.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentorList.map((mentor) => (
          <MentorCard
            key={mentor.user_id}
            mentor={mentor}
            onRequest={handleRequestMentorship}
            onMessage={handleMessageMentor}
            isLoading={actionLoading === mentor.user_id}
          />
        ))}
      </div>
    );
  };

  const renderRequestsList = () => {
    if (requests.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No requests sent
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start by requesting mentorship from available mentors.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-semibold">
                      {request.mentor?.user?.full_name || 'Unknown Mentor'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Requested {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {request.goals.slice(0, 3).map((goal, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {goal}
                        </Badge>
                      ))}
                      {request.goals.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          +{request.goals.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={request.status === 'accepted' ? 'default' : 
                          request.status === 'declined' ? 'destructive' : 'secondary'}
                >
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderRelationshipsList = () => {
    if (relationships.length === 0) {
      return (
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No active mentorships
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your accepted mentorship requests will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {relationships.map((relationship) => (
          <Card key={relationship.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h4 className="font-semibold">
                      {relationship.mentor?.user?.full_name || 'Unknown Mentor'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Started {new Date(relationship.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {relationship.goals.slice(0, 3).map((goal, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {goal}
                        </Badge>
                      ))}
                      {relationship.goals.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          +{relationship.goals.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="default">Active</Badge>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
            Mentorship Program
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Connect with experienced mentors to accelerate your growth
          </p>
        </div>
        <Button variant="outline" className="mt-4 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" />
          Become a Mentor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Mentors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mentors.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready to help
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mentorships</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationships.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently learning
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expertise Areas</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mentors.flatMap(m => m.expertise_areas)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Different skills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search mentors by name, expertise, or bio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Expertise Area" />
              </SelectTrigger>
              <SelectContent>
                {expertiseAreas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area === 'all' ? 'All Areas' : area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mentorship Tabs */}
      <Tabs defaultValue="find-mentors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="find-mentors">Find Mentors</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="active-mentorships">Active Mentorships</TabsTrigger>
        </TabsList>

        <TabsContent value="find-mentors" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            renderMentorGrid(filteredMentors)
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="mt-6">
          {renderRequestsList()}
        </TabsContent>

        <TabsContent value="active-mentorships" className="mt-6">
          {renderRelationshipsList()}
        </TabsContent>
      </Tabs>

      {/* Mentorship Request Dialog */}
      <MentorshipRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        mentor={selectedMentor}
        onSubmit={handleSubmitRequest}
        isLoading={actionLoading === 'request'}
      />
    </div>
  );
}