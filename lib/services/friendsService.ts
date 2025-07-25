// Epic 7, Story 7.6: Friend System and Social Connections Service

import { supabase } from '@/lib/supabase';
import type { 
  Friendship, 
  FriendRequest,
  FriendRecommendation,
  PrivateGroup,
  CreatePrivateGroupRequest
} from '@/lib/types/social';

export class FriendsService {
  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string, message?: string): Promise<FriendRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (user.id === userId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
      .single();

    if (existingFriendship) {
      throw new Error('Friendship already exists or request already sent');
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{
        requester_id: user.id,
        requestee_id: userId,
        message,
        status: 'pending',
      }])
      .select(`
        *,
        requester:profiles!friend_requests_requester_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        ),
        requestee:profiles!friend_requests_requestee_id_fkey(
          id,
          full_name,
          avatar_url,
          level
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Friend request already sent');
      }
      throw error;
    }

    return data;
  }

  /**
   * Respond to friend request
   */
  async respondToFriendRequest(
    requestId: string, 
    response: 'accepted' | 'declined'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('requestee_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (request.status !== 'pending') {
      throw new Error('Request is no longer pending');
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ 
        status: response,
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // If accepted, create friendship
    if (response === 'accepted') {
      await this.createFriendship(request.requester_id, request.requestee_id);
    }
  }

  /**
   * Create mutual friendship
   */
  private async createFriendship(userId1: string, userId2: string): Promise<void> {
    const friendshipData = [
      {
        user_id: userId1,
        friend_id: userId2,
        status: 'accepted',
      },
      {
        user_id: userId2,
        friend_id: userId1,
        status: 'accepted',
      },
    ];

    const { error } = await supabase
      .from('friendships')
      .insert(friendshipData);

    if (error) throw error;
  }

  /**
   * Get user's friends
   */
  async getFriends(userId?: string): Promise<Friendship[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:profiles!friendships_friend_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          total_xp,
          last_active_at
        )
      `)
      .eq('user_id', targetUserId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(friendship => ({
      ...friendship,
      is_online: friendship.friend?.last_active_at 
        ? new Date(friendship.friend.last_active_at).getTime() > Date.now() - 15 * 60 * 1000 // 15 minutes
        : false,
    }));
  }

  /**
   * Get friend requests (sent and received)
   */
  async getFriendRequests(type: 'sent' | 'received'): Promise<FriendRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const field = type === 'sent' ? 'requester_id' : 'requestee_id';
    const selectField = type === 'sent' ? 
      'requestee:profiles!friend_requests_requestee_id_fkey' :
      'requester:profiles!friend_requests_requester_id_fkey';

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        ${selectField}(
          id,
          full_name,
          avatar_url,
          level
        )
      `)
      .eq(field, user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Remove friend
   */
  async removeFriend(friendId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Remove both sides of the friendship
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    if (error) throw error;
  }

  /**
   * Cancel friend request
   */
  async cancelFriendRequest(requestId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (error) throw error;
  }

  /**
   * Get friend recommendations
   */
  async getFriendRecommendations(limit: number = 10): Promise<FriendRecommendation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get users who are not friends and have mutual connections
    const { data, error } = await supabase.rpc('get_friend_recommendations', {
      current_user_id: user.id,
      limit_count: limit,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Search users for friend invitations
   */
  async searchUsers(query: string, limit: number = 20): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get existing friend IDs to exclude
    const { data: existingFriends } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id);

    const friendIds = existingFriends?.map(f => f.friend_id) || [];
    friendIds.push(user.id); // Exclude self

    let query_builder = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, level, total_xp')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (friendIds.length > 0) {
      query_builder = query_builder.not('id', 'in', `(${friendIds.join(',')})`);
    }

    const { data, error } = await query_builder;

    if (error) throw error;
    return data || [];
  }

  /**
   * Invite friends via email
   */
  async inviteFriends(emails: string[], message?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const invitations = emails.map(email => ({
      invited_by: user.id,
      email,
      message,
      invitation_type: 'friend',
    }));

    const { error } = await supabase
      .from('email_invitations')
      .insert(invitations);

    if (error) throw error;

    // TODO: Send actual email invitations
    console.log('Email invitations to send:', invitations);
  }

  /**
   * Create private group
   */
  async createPrivateGroup(data: CreatePrivateGroupRequest): Promise<PrivateGroup> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const groupData = {
      ...data,
      created_by: user.id,
    };

    const { data: group, error } = await supabase
      .from('private_groups')
      .insert([groupData])
      .select(`
        *,
        creator:profiles!private_groups_created_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // Add creator as member
    await supabase
      .from('private_group_members')
      .insert([{
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      }]);

    return group;
  }

  /**
   * Add members to private group
   */
  async addGroupMembers(groupId: string, userIds: string[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is admin of the group
    const { data: membership } = await supabase
      .from('private_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'admin') {
      throw new Error('Only group admins can add members');
    }

    const members = userIds.map(userId => ({
      group_id: groupId,
      user_id: userId,
      role: 'member',
    }));

    const { error } = await supabase
      .from('private_group_members')
      .insert(members);

    if (error) throw error;
  }

  /**
   * Get user's private groups
   */
  async getPrivateGroups(): Promise<PrivateGroup[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('private_group_members')
      .select(`
        role,
        joined_at,
        group:private_groups!private_group_members_group_id_fkey(
          *,
          creator:profiles!private_groups_created_by_fkey(
            id,
            full_name,
            avatar_url
          ),
          members:private_group_members(count)
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      ...item.group,
      user_role: item.role,
      member_count: item.group.members?.[0]?.count || 0,
    }));
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('private_group_members')
      .select(`
        *,
        user:profiles!private_group_members_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          last_active_at
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Leave private group
   */
  async leaveGroup(groupId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is the only admin
    const { data: admins } = await supabase
      .from('private_group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('role', 'admin');

    if (admins && admins.length === 1 && admins[0].user_id === user.id) {
      throw new Error('Cannot leave group - you are the only admin. Transfer admin role first.');
    }

    const { error } = await supabase
      .from('private_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Update friendship privacy settings
   */
  async updatePrivacySettings(settings: {
    show_online_status?: boolean;
    allow_friend_requests?: boolean;
    show_activity_to_friends?: boolean;
    show_achievements_to_friends?: boolean;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_privacy_settings')
      .upsert([{
        user_id: user.id,
        ...settings,
      }]);

    if (error) throw error;
  }

  /**
   * Get user's privacy settings
   */
  async getPrivacySettings(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return default settings if none exist
    return data || {
      show_online_status: true,
      allow_friend_requests: true,
      show_activity_to_friends: true,
      show_achievements_to_friends: true,
    };
  }

  /**
   * Block/unblock user
   */
  async toggleBlock(userId: string): Promise<{ blocked: boolean }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already blocked
    const { data: existingBlock } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .single();

    if (existingBlock) {
      // Unblock
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', existingBlock.id);

      if (error) throw error;
      return { blocked: false };
    } else {
      // Block - also remove friendship if exists
      await this.removeFriend(userId);

      const { error } = await supabase
        .from('blocked_users')
        .insert([{
          blocker_id: user.id,
          blocked_id: userId,
        }]);

      if (error) throw error;
      return { blocked: true };
    }
  }

  /**
   * Get friend-only challenges
   */
  async getFriendChallenges(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get challenges created by friends or where user is invited by friends
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        creator:profiles!challenges_created_by_fkey(
          id,
          full_name,
          avatar_url
        ),
        participants:challenge_participants(count)
      `)
      .or(`created_by.in.(SELECT friend_id FROM friendships WHERE user_id = '${user.id}' AND status = 'accepted'),id.in.(SELECT challenge_id FROM challenge_invitations WHERE invited_user = '${user.id}')`)
      .eq('is_public', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get friend activity visibility
   */
  async getFriendActivityVisibility(friendId: string): Promise<{
    can_see_activities: boolean;
    can_see_achievements: boolean;
    is_online: boolean;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if they are friends
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .eq('status', 'accepted')
      .single();

    if (!friendship) {
      return {
        can_see_activities: false,
        can_see_achievements: false,
        is_online: false,
      };
    }

    // Get friend's privacy settings
    const { data: privacySettings } = await supabase
      .from('user_privacy_settings')
      .select('show_activity_to_friends, show_achievements_to_friends, show_online_status')
      .eq('user_id', friendId)
      .single();

    // Get friend's online status
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_active_at')
      .eq('id', friendId)
      .single();

    const isOnline = profile?.last_active_at 
      ? new Date(profile.last_active_at).getTime() > Date.now() - 15 * 60 * 1000
      : false;

    return {
      can_see_activities: privacySettings?.show_activity_to_friends ?? true,
      can_see_achievements: privacySettings?.show_achievements_to_friends ?? true,
      is_online: (privacySettings?.show_online_status ?? true) && isOnline,
    };
  }
}

export const friendsService = new FriendsService();