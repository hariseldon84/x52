// Epic 7, Story 7.6: Friends Page

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Clock, UserPlus, Mail, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { FriendCard } from '@/components/friends/FriendCard';
import { friendsService } from '@/lib/services/friendsService';
import type { Friendship, FriendRequest, FriendRecommendation } from '@/lib/types/social';

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [recommendations, setRecommendations] = useState<FriendRecommendation[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('friends');
  const { toast } = useToast();

  useEffect(() => {
    loadFriendsData();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const loadFriendsData = async () => {
    try {
      setIsLoading(true);
      
      const [friendsData, sentRequestsData, receivedRequestsData, recommendationsData] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getFriendRequests('sent'),
        friendsService.getFriendRequests('received'),
        friendsService.getFriendRecommendations(10),
      ]);

      setFriends(friendsData);
      setSentRequests(sentRequestsData);
      setReceivedRequests(receivedRequestsData);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Error loading friends data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load friends data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      const results = await friendsService.searchUsers(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      setActionLoading(userId);
      await friendsService.sendFriendRequest(userId);
      
      toast({
        title: 'Success',
        description: 'Friend request sent!',
      });
      
      await loadFriendsData();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send friend request.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespondToRequest = async (requestId: string, response: 'accepted' | 'declined') => {
    try {
      setActionLoading(requestId);
      await friendsService.respondToFriendRequest(requestId, response);
      
      toast({
        title: response === 'accepted' ? 'Friend Added!' : 'Request Declined',
        description: response === 'accepted' 
          ? 'You are now friends!' 
          : 'Friend request declined.',
      });
      
      await loadFriendsData();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast({
        title: 'Error',
        description: 'Failed to respond to friend request.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      setActionLoading(friendId);
      await friendsService.removeFriend(friendId);
      
      toast({
        title: 'Friend Removed',
        description: 'User has been removed from your friends list.',
      });
      
      await loadFriendsData();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove friend.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      await friendsService.toggleBlock(userId);
      
      toast({
        title: 'User Blocked',
        description: 'User has been blocked and removed from your friends list.',
      });
      
      await loadFriendsData();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to block user.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = (userId: string) => {
    // Navigate to chat/messaging
    toast({
      title: 'Coming Soon',
      description: 'Messaging feature will be available soon.',
    });
  };

  const handleViewProfile = (userId: string) => {
    // Navigate to user profile
    window.location.href = `/profile/${userId}`;
  };

  const renderFriendsGrid = () => {
    if (friends.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No friends yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start by sending friend requests or accepting incoming requests.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {friends.map((friendship) => (
          <FriendCard
            key={friendship.id}
            friendship={friendship}
            onMessage={handleMessage}
            onRemove={handleRemoveFriend}
            onBlock={handleBlockUser}
            onViewProfile={handleViewProfile}
            isLoading={actionLoading === friendship.friend.id}
          />
        ))}
      </div>
    );
  };

  const renderReceivedRequests = () => {
    if (receivedRequests.length === 0) {
      return (
        <div className="text-center py-12">
          <Clock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No pending requests
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Friend requests you receive will appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {receivedRequests.filter(r => r.status === 'pending').map((request) => (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.requester?.avatar_url} />
                    <AvatarFallback>
                      {request.requester?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h4 className="font-semibold">
                      {request.requester?.full_name || 'Unknown User'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sent {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.message && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        "{request.message}"
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRespondToRequest(request.id, 'accepted')}
                    disabled={actionLoading === request.id}
                    size="sm"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleRespondToRequest(request.id, 'declined')}
                    disabled={actionLoading === request.id}
                    variant="outline"
                    size="sm"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderRecommendations = () => {
    if (recommendations.length === 0) {
      return (
        <div className="text-center py-12">
          <UserPlus className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No recommendations
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Friend recommendations will appear here based on mutual connections.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((rec) => (
          <Card key={rec.user_id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={rec.avatar_url} />
                  <AvatarFallback>
                    {rec.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h4 className="font-semibold">{rec.full_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {rec.mutual_friends_count} mutual friends
                  </p>
                </div>
              </div>
              
              <Button
                onClick={() => handleSendFriendRequest(rec.user_id)}
                disabled={actionLoading === rec.user_id}
                className="w-full"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (searchTerm.length < 2) {
      return (
        <div className="text-center py-12">
          <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Search for friends
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Enter at least 2 characters to search for users.
          </p>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No users found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search terms.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchResults.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h4 className="font-semibold">{user.full_name}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Level {user.level}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {user.total_xp?.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => handleSendFriendRequest(user.id)}
                disabled={actionLoading === user.id}
                className="w-full"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Send Request
              </Button>
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
            Friends
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Connect with other productivity enthusiasts
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Invite Friends
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Privacy
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Friends</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{friends.length}</div>
            <p className="text-xs text-muted-foreground">
              {friends.filter(f => f.is_online).length} online
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
              {receivedRequests.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Requests</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentRequests.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Waiting for approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              Suggested friends
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for friends by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Friends Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="friends">My Friends</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {receivedRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            renderFriendsGrid()
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          {renderReceivedRequests()}
        </TabsContent>

        <TabsContent value="discover" className="mt-6">
          {renderRecommendations()}
        </TabsContent>

        <TabsContent value="search" className="mt-6">
          {renderSearchResults()}
        </TabsContent>
      </Tabs>
    </div>
  );
}