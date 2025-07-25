// Epic 7, Story 7.3: Guilds Page

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Target, BookOpen, Dumbbell, Palette, Briefcase, Heart } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { GuildCard } from '@/components/guilds/GuildCard';
import { CreateGuildDialog } from '@/components/guilds/CreateGuildDialog';
import { guildService } from '@/lib/services/guildService';
import type { Guild, CreateGuildRequest } from '@/lib/types/social';

const categories = [
  { id: 'all', label: 'All Categories', icon: Users },
  { id: 'productivity', label: 'Productivity', icon: Target },
  { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'creativity', label: 'Creative', icon: Palette },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'social', label: 'Social', icon: Heart },
];

export default function GuildsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuilds, setMyGuilds] = useState<Guild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPublicFilter, setIsPublicFilter] = useState<string>('public');
  const { toast } = useToast();

  useEffect(() => {
    loadGuilds();
  }, [categoryFilter, isPublicFilter]);

  const loadGuilds = async () => {
    try {
      setIsLoading(true);
      
      const filters = {
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        is_public: isPublicFilter === 'public' ? true : isPublicFilter === 'private' ? false : undefined,
        limit: 50,
      };

      const [allGuilds, userGuilds] = await Promise.all([
        guildService.getGuilds(filters),
        guildService.getUserGuilds(),
      ]);

      setGuilds(allGuilds);
      setMyGuilds(userGuilds);
    } catch (error) {
      console.error('Error loading guilds:', error);
      toast({
        title: 'Error',
        description: 'Failed to load guilds. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGuild = async (data: CreateGuildRequest) => {
    try {
      setActionLoading('create');
      await guildService.createGuild(data);
      
      toast({
        title: 'Success',
        description: 'Guild created successfully!',
      });
      
      await loadGuilds();
    } catch (error) {
      console.error('Error creating guild:', error);
      toast({
        title: 'Error',
        description: 'Failed to create guild. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinGuild = async (guildId: string) => {
    try {
      setActionLoading(guildId);
      await guildService.joinGuild(guildId);
      
      toast({
        title: 'Success',
        description: 'Successfully joined the guild!',
      });
      
      await loadGuilds();
    } catch (error) {
      console.error('Error joining guild:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join guild.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveGuild = async (guildId: string) => {
    try {
      setActionLoading(guildId);
      await guildService.leaveGuild(guildId);
      
      toast({
        title: 'Success',
        description: 'Successfully left the guild.',
      });
      
      await loadGuilds();
    } catch (error) {
      console.error('Error leaving guild:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to leave guild.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewGuild = (guildId: string) => {
    // Navigate to guild detail page
    window.location.href = `/guilds/${guildId}`;
  };

  const filteredGuilds = guilds.filter(guild =>
    guild.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guild.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMyGuilds = myGuilds.filter(guild =>
    guild.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guild.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderGuildGrid = (guildList: Guild[]) => {
    if (guildList.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No guilds found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm 
              ? 'Try adjusting your search or filters.'
              : 'Create a new guild to get started!'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guildList.map((guild) => (
          <GuildCard
            key={guild.id}
            guild={guild}
            onJoin={handleJoinGuild}
            onLeave={handleLeaveGuild}
            onView={handleViewGuild}
            isLoading={actionLoading === guild.id}
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
            Productivity Guilds
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Join communities of like-minded individuals working towards similar goals
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="mt-4 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" />
          Create Guild
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guilds</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guilds.length}</div>
            <p className="text-xs text-muted-foreground">
              Available to join
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Guilds</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myGuilds.length}</div>
            <p className="text-xs text-muted-foreground">
              Communities joined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(guilds.map(g => g.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Different interests
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
                placeholder="Search guilds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {category.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={isPublicFilter} onValueChange={setIsPublicFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guilds</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Guild Tabs */}
      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="discover">Discover Guilds</TabsTrigger>
          <TabsTrigger value="my-guilds">My Guilds</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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
            renderGuildGrid(filteredGuilds)
          )}
        </TabsContent>

        <TabsContent value="my-guilds" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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
            renderGuildGrid(filteredMyGuilds)
          )}
        </TabsContent>
      </Tabs>

      {/* Create Guild Dialog */}
      <CreateGuildDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateGuild}
        isLoading={actionLoading === 'create'}
      />
    </div>
  );
}