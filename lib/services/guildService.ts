// Epic 7, Story 7.3: Guild/Community Service

import { supabase } from '@/lib/supabase';
import type { 
  Guild, 
  GuildMember, 
  GuildDiscussion,
  GuildInvitation,
  CreateGuildRequest,
  GuildStats
} from '@/lib/types/social';

export class GuildService {
  /**
   * Create a new guild
   */
  async createGuild(data: CreateGuildRequest): Promise<Guild> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const guildData = {
      ...data,
      created_by: user.id,
      member_count: 1,
    };

    const { data: guild, error } = await supabase
      .from('guilds')
      .insert([guildData])
      .select(`
        *,
        creator:profiles!guilds_created_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // Automatically add creator as guild leader
    await this.addGuildMember(guild.id, user.id, 'leader');

    return guild;
  }

  /**
   * Get guilds with filtering and pagination
   */
  async getGuilds(options: {
    is_public?: boolean;
    search?: string;
    category?: string;
    user_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Guild[]> {
    let query = supabase
      .from('guilds')
      .select(`
        *,
        creator:profiles!guilds_created_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `);

    if (options.is_public !== undefined) {
      query = query.eq('is_public', options.is_public);
    }

    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.user_id) {
      query = query.eq('created_by', options.user_id);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Get a specific guild by ID
   */
  async getGuild(id: string): Promise<Guild | null> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('guilds')
      .select(`
        *,
        creator:profiles!guilds_created_by_fkey(
          id,
          full_name,
          avatar_url
        ),
        members:guild_members(
          count
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Check if user is a member
    let is_member = false;
    let user_role = null;
    
    if (user) {
      const { data: membership } = await supabase
        .from('guild_members')
        .select('role')
        .eq('guild_id', id)
        .eq('user_id', user.id)
        .single();
      
      if (membership) {
        is_member = true;
        user_role = membership.role;
      }
    }

    return {
      ...data,
      member_count: data.members?.[0]?.count || 0,
      is_member,
      user_role,
    };
  }

  /**
   * Join a guild
   */
  async joinGuild(guildId: string): Promise<GuildMember> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if guild exists and is joinable
    const guild = await this.getGuild(guildId);
    if (!guild) throw new Error('Guild not found');
    if (!guild.is_public) throw new Error('Guild is private - invitation required');
    if (guild.member_count >= guild.max_members) {
      throw new Error('Guild is full');
    }

    const { data, error } = await supabase
      .from('guild_members')
      .insert([{
        guild_id: guildId,
        user_id: user.id,
        role: 'member',
      }])
      .select(`
        *,
        user:profiles!guild_members_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('You are already a member of this guild');
      }
      throw error;
    }

    // Update guild member count
    await this.updateGuildMemberCount(guildId);

    return data;
  }

  /**
   * Leave a guild
   */
  async leaveGuild(guildId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is the only leader
    const { data: leaders } = await supabase
      .from('guild_members')
      .select('user_id')
      .eq('guild_id', guildId)
      .eq('role', 'leader');

    if (leaders && leaders.length === 1 && leaders[0].user_id === user.id) {
      throw new Error('Cannot leave guild - you are the only leader. Transfer leadership first.');
    }

    const { error } = await supabase
      .from('guild_members')
      .delete()
      .eq('guild_id', guildId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Update guild member count
    await this.updateGuildMemberCount(guildId);
  }

  /**
   * Get guild members
   */
  async getGuildMembers(guildId: string): Promise<GuildMember[]> {
    const { data, error } = await supabase
      .from('guild_members')
      .select(`
        *,
        user:profiles!guild_members_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          total_xp
        )
      `)
      .eq('guild_id', guildId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Add guild member (internal method)
   */
  private async addGuildMember(
    guildId: string, 
    userId: string, 
    role: 'leader' | 'moderator' | 'member' = 'member'
  ): Promise<void> {
    await supabase
      .from('guild_members')
      .insert([{
        guild_id: guildId,
        user_id: userId,
        role,
      }]);

    await this.updateGuildMemberCount(guildId);
  }

  /**
   * Update guild member count
   */
  private async updateGuildMemberCount(guildId: string): Promise<void> {
    const { count } = await supabase
      .from('guild_members')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId);

    await supabase
      .from('guilds')
      .update({ member_count: count || 0 })
      .eq('id', guildId);
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    guildId: string, 
    userId: string, 
    newRole: 'leader' | 'moderator' | 'member'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if current user has permission to update roles
    const { data: currentMember } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .single();

    if (!currentMember || currentMember.role !== 'leader') {
      throw new Error('Only guild leaders can update member roles');
    }

    const { error } = await supabase
      .from('guild_members')
      .update({ role: newRole })
      .eq('guild_id', guildId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Remove guild member
   */
  async removeMember(guildId: string, userId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if current user has permission to remove members
    const { data: currentMember } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .single();

    if (!currentMember || !['leader', 'moderator'].includes(currentMember.role)) {
      throw new Error('Only guild leaders and moderators can remove members');
    }

    const { error } = await supabase
      .from('guild_members')
      .delete()
      .eq('guild_id', guildId)
      .eq('user_id', userId);

    if (error) throw error;

    await this.updateGuildMemberCount(guildId);
  }

  /**
   * Get guild discussions
   */
  async getGuildDiscussions(guildId: string, limit: number = 20): Promise<GuildDiscussion[]> {
    const { data, error } = await supabase
      .from('guild_discussions')
      .select(`
        *,
        author:profiles!guild_discussions_user_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        replies:guild_discussion_replies(
          count
        )
      `)
      .eq('guild_id', guildId)
      .eq('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(discussion => ({
      ...discussion,
      reply_count: discussion.replies?.[0]?.count || 0,
    }));
  }

  /**
   * Create guild discussion
   */
  async createDiscussion(
    guildId: string, 
    title: string, 
    content: string,
    parentId?: string
  ): Promise<GuildDiscussion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is a guild member
    const { data: membership } = await supabase
      .from('guild_members')
      .select('id')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      throw new Error('You must be a guild member to post discussions');
    }

    const { data, error } = await supabase
      .from('guild_discussions')
      .insert([{
        guild_id: guildId,
        user_id: user.id,
        title,
        content,
        parent_id: parentId,
      }])
      .select(`
        *,
        author:profiles!guild_discussions_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get guild statistics
   */
  async getGuildStats(guildId: string): Promise<GuildStats> {
    const [membersData, discussionsData, challengesData] = await Promise.all([
      supabase
        .from('guild_members')
        .select('user_id, user:profiles!guild_members_user_id_fkey(total_xp, level)')
        .eq('guild_id', guildId),
      
      supabase
        .from('guild_discussions')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId),
      
      supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
    ]);

    const members = membersData.data || [];
    const totalXP = members.reduce((sum, member) => sum + (member.user?.total_xp || 0), 0);
    const averageLevel = members.length > 0 
      ? members.reduce((sum, member) => sum + (member.user?.level || 1), 0) / members.length 
      : 0;

    return {
      member_count: members.length,
      total_xp: totalXP,
      average_level: Math.round(averageLevel * 10) / 10,
      discussion_count: discussionsData.count || 0,
      challenge_count: challengesData.count || 0,
    };
  }

  /**
   * Search guilds
   */
  async searchGuilds(query: string, filters: {
    category?: string;
    is_public?: boolean;
    limit?: number;
  } = {}): Promise<Guild[]> {
    return this.getGuilds({
      search: query,
      ...filters,
    });
  }

  /**
   * Get user's guilds
   */
  async getUserGuilds(userId?: string): Promise<Guild[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('guild_members')
      .select(`
        role,
        joined_at,
        guild:guilds!guild_members_guild_id_fkey(
          *,
          creator:profiles!guilds_created_by_fkey(
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', targetUserId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      ...item.guild,
      user_role: item.role,
      is_member: true,
    }));
  }

  /**
   * Invite user to guild
   */
  async inviteToGuild(guildId: string, email: string): Promise<GuildInvitation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user has permission to invite
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['leader', 'moderator'].includes(membership.role)) {
      throw new Error('Only guild leaders and moderators can invite members');
    }

    const { data, error } = await supabase
      .from('guild_invitations')
      .insert([{
        guild_id: guildId,
        invited_by: user.id,
        email,
      }])
      .select(`
        *,
        guild:guilds!guild_invitations_guild_id_fkey(
          id,
          name,
          description
        ),
        inviter:profiles!guild_invitations_invited_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // TODO: Send email invitation
    console.log('Guild invitation to send:', data);

    return data;
  }

  /**
   * Update guild settings
   */
  async updateGuild(
    guildId: string, 
    updates: Partial<Pick<Guild, 'name' | 'description' | 'is_public' | 'category' | 'max_members'>>
  ): Promise<Guild> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user is guild leader
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'leader') {
      throw new Error('Only guild leaders can update guild settings');
    }

    const { data, error } = await supabase
      .from('guilds')
      .update(updates)
      .eq('id', guildId)
      .select(`
        *,
        creator:profiles!guilds_created_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete guild
   */
  async deleteGuild(guildId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const guild = await this.getGuild(guildId);
    if (!guild) throw new Error('Guild not found');
    if (guild.created_by !== user.id) {
      throw new Error('Only guild creator can delete the guild');
    }

    const { error } = await supabase
      .from('guilds')
      .delete()
      .eq('id', guildId);

    if (error) throw error;
  }
}

export const guildService = new GuildService();