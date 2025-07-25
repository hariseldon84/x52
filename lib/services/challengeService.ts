// Epic 7, Story 7.1: Team Challenge Creation and Management Service

import { supabase } from '@/lib/supabase';
import type { 
  Challenge, 
  ChallengeParticipant, 
  ChallengeInvitation,
  CreateChallengeRequest,
  InviteToChallengeRequest,
  ChallengeScore,
  ChallengeStats
} from '@/lib/types/social';

export class ChallengeService {
  /**
   * Create a new challenge
   */
  async createChallenge(data: CreateChallengeRequest): Promise<Challenge> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const challengeData = {
      ...data,
      created_by: user.id,
      max_participants: data.max_participants || 50,
      is_public: data.is_public ?? true,
      prize_xp: data.prize_xp || 0,
    };

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert([challengeData])
      .select(`
        *,
        creator:profiles!challenges_created_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return challenge;
  }

  /**
   * Get challenges with filtering and pagination
   */
  async getChallenges(options: {
    status?: Challenge['status'];
    type?: Challenge['challenge_type'];
    is_public?: boolean;
    user_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Challenge[]> {
    let query = supabase
      .from('challenges')
      .select(`
        *,
        creator:profiles!challenges_created_by_fkey(
          id,
          full_name,
          avatar_url
        ),
        participants:challenge_participants(count)
      `);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.type) {
      query = query.eq('challenge_type', options.type);
    }

    if (options.is_public !== undefined) {
      query = query.eq('is_public', options.is_public);
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

    return data.map(challenge => ({
      ...challenge,
      participant_count: challenge.participants?.[0]?.count || 0,
    }));
  }

  /**
   * Get a specific challenge by ID
   */
  async getChallenge(id: string): Promise<Challenge | null> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        creator:profiles!challenges_created_by_fkey(
          id,
          full_name,
          avatar_url
        ),
        participants:challenge_participants(
          count,
          user_id,
          rank,
          score
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const participant_count = data.participants?.length || 0;
    const user_participation = user ? 
      data.participants?.find((p: any) => p.user_id === user.id) : null;

    return {
      ...data,
      participant_count,
      is_participant: !!user_participation,
      user_rank: user_participation?.rank,
    };
  }

  /**
   * Join a challenge
   */
  async joinChallenge(challengeId: string): Promise<ChallengeParticipant> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if challenge exists and is joinable
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.status !== 'upcoming' && challenge.status !== 'active') {
      throw new Error('Challenge is not accepting participants');
    }
    if (challenge.participant_count >= challenge.max_participants) {
      throw new Error('Challenge is full');
    }

    const { data, error } = await supabase
      .from('challenge_participants')
      .insert([{
        challenge_id: challengeId,
        user_id: user.id,
      }])
      .select(`
        *,
        user:profiles!challenge_participants_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('You are already participating in this challenge');
      }
      throw error;
    }

    return data;
  }

  /**
   * Leave a challenge
   */
  async leaveChallenge(challengeId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Get challenge participants with rankings
   */
  async getChallengeParticipants(challengeId: string): Promise<ChallengeParticipant[]> {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        user:profiles!challenge_participants_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('challenge_id', challengeId)
      .order('score', { ascending: false });

    if (error) throw error;

    // Add ranking
    return data.map((participant, index) => ({
      ...participant,
      rank: index + 1,
    }));
  }

  /**
   * Invite users to a challenge
   */
  async inviteToChallenge(data: InviteToChallengeRequest): Promise<ChallengeInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const invitations = data.invitees.map(invitee => ({
      challenge_id: data.challenge_id,
      invited_by: user.id,
      invited_user: invitee.user_id,
      email: invitee.email,
    }));

    const { data: results, error } = await supabase
      .from('challenge_invitations')
      .insert(invitations)
      .select(`
        *,
        challenge:challenges!challenge_invitations_challenge_id_fkey(
          id,
          name,
          description
        ),
        inviter:profiles!challenge_invitations_invited_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `);

    if (error) throw error;

    // Send notification emails for email invitations
    const emailInvitations = results.filter(inv => inv.email);
    if (emailInvitations.length > 0) {
      // TODO: Implement email notification service
      console.log('Email invitations to send:', emailInvitations);
    }

    return results;
  }

  /**
   * Get user's challenge invitations
   */
  async getUserInvitations(): Promise<ChallengeInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('challenge_invitations')
      .select(`
        *,
        challenge:challenges!challenge_invitations_challenge_id_fkey(
          id,
          name,
          description,
          start_date,
          end_date
        ),
        inviter:profiles!challenge_invitations_invited_by_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('invited_user', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Respond to a challenge invitation
   */
  async respondToInvitation(
    invitationId: string, 
    response: 'accepted' | 'declined'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: invitation, error: fetchError } = await supabase
      .from('challenge_invitations')
      .select('*, challenge:challenges(*)')
      .eq('id', invitationId)
      .eq('invited_user', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer pending');
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('challenge_invitations')
      .update({ status: response })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    // If accepted, automatically join the challenge
    if (response === 'accepted') {
      try {
        await this.joinChallenge(invitation.challenge_id);
      } catch (error) {
        // If joining fails, revert the invitation status
        await supabase
          .from('challenge_invitations')
          .update({ status: 'pending' })
          .eq('id', invitationId);
        throw error;
      }
    }
  }

  /**
   * Update challenge scores (called by background job)
   */
  async updateChallengeScores(challengeId: string): Promise<void> {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge || challenge.status !== 'active') return;

    const participants = await this.getChallengeParticipants(challengeId);
    const scores = await this.calculateChallengeScores(challenge, participants);

    // Update participant scores and rankings
    const updates = scores.map(score => ({
      challenge_id: challengeId,
      user_id: score.user_id,
      score: score.score,
      rank: score.rank,
    }));

    const { error } = await supabase
      .from('challenge_participants')
      .upsert(updates, {
        onConflict: 'challenge_id,user_id',
        ignoreDuplicates: false,
      });

    if (error) throw error;
  }

  /**
   * Calculate challenge scores based on challenge type
   */
  private async calculateChallengeScores(
    challenge: Challenge, 
    participants: ChallengeParticipant[]
  ): Promise<ChallengeScore[]> {
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    const now = new Date();
    const effectiveEndDate = now < endDate ? now : endDate;

    const scores: ChallengeScore[] = [];

    for (const participant of participants) {
      let score = 0;
      let details: Record<string, any> = {};

      switch (challenge.challenge_type) {
        case 'most_xp':
          score = await this.calculateXPScore(participant.user_id, startDate, effectiveEndDate);
          details = { xp_earned: score };
          break;

        case 'most_tasks':
          score = await this.calculateTaskScore(participant.user_id, startDate, effectiveEndDate);
          details = { tasks_completed: score };
          break;

        case 'longest_streak':
          score = await this.calculateStreakScore(participant.user_id, startDate, effectiveEndDate);
          details = { max_streak: score };
          break;

        case 'custom':
          // Custom scoring based on challenge rules
          score = await this.calculateCustomScore(
            participant.user_id, 
            startDate, 
            effectiveEndDate, 
            challenge.rules
          );
          details = { custom_score: score };
          break;
      }

      scores.push({
        user_id: participant.user_id,
        score,
        rank: 0, // Will be set after sorting
        details,
      });
    }

    // Sort by score and assign ranks
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((score, index) => {
      score.rank = index + 1;
    });

    return scores;
  }

  /**
   * Calculate XP earned during challenge period
   */
  private async calculateXPScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await supabase
      .from('tasks')
      .select('xp_earned')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString());

    if (error) throw error;

    return data.reduce((total, task) => total + (task.xp_earned || 0), 0);
  }

  /**
   * Calculate tasks completed during challenge period
   */
  private async calculateTaskScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const { data, error } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString());

    if (error) throw error;

    return data?.length || 0;
  }

  /**
   * Calculate longest streak during challenge period
   */
  private async calculateStreakScore(userId: string, startDate: Date, endDate: Date): Promise<number> {
    // This is a simplified version - in reality, you'd want more sophisticated streak calculation
    const { data, error } = await supabase
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    if (error) return 0;

    return data?.current_streak || 0;
  }

  /**
   * Calculate custom score based on challenge rules
   */
  private async calculateCustomScore(
    userId: string, 
    startDate: Date, 
    endDate: Date, 
    rules: Record<string, any>
  ): Promise<number> {
    // Implement custom scoring logic based on rules
    // This is a placeholder implementation
    return 0;
  }

  /**
   * Complete a challenge and determine winners
   */
  async completeChallenge(challengeId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const challenge = await this.getChallenge(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.created_by !== user.id) {
      throw new Error('Only challenge creator can complete the challenge');
    }

    // Update final scores
    await this.updateChallengeScores(challengeId);

    // Get top participants
    const participants = await this.getChallengeParticipants(challengeId);
    const winners = participants.slice(0, 3); // Top 3 winners

    // Mark winners and award bonus XP
    for (const winner of winners) {
      await supabase
        .from('challenge_participants')
        .update({ is_winner: true })
        .eq('id', winner.id);

      // Award bonus XP
      if (challenge.prize_xp > 0) {
        let bonusXP = challenge.prize_xp;
        if (winner.rank === 2) bonusXP = Math.floor(bonusXP * 0.6);
        if (winner.rank === 3) bonusXP = Math.floor(bonusXP * 0.3);

        // TODO: Add XP to user's total
        console.log(`Award ${bonusXP} XP to user ${winner.user_id}`);
      }
    }

    // Update challenge status
    const { error } = await supabase
      .from('challenges')
      .update({ status: 'completed' })
      .eq('id', challengeId);

    if (error) throw error;

    // Create social activities for winners
    for (const winner of winners) {
      await this.createWinnerActivity(winner, challenge);
    }
  }

  /**
   * Create social activity for challenge winner
   */
  private async createWinnerActivity(
    winner: ChallengeParticipant, 
    challenge: Challenge
  ): Promise<void> {
    const title = winner.rank === 1 
      ? `🏆 Won "${challenge.name}" Challenge!`
      : `🥈 Placed #${winner.rank} in "${challenge.name}" Challenge!`;

    await supabase
      .from('social_activities')
      .insert([{
        user_id: winner.user_id,
        activity_type: 'challenge_win',
        title,
        description: `Scored ${winner.score} points in the ${challenge.challenge_type.replace('_', ' ')} challenge.`,
        metadata: {
          challenge_id: challenge.id,
          challenge_name: challenge.name,
          rank: winner.rank,
          score: winner.score,
          challenge_type: challenge.challenge_type,
        },
        visibility: 'public',
      }]);
  }

  /**
   * Get challenge statistics
   */
  async getChallengeStats(challengeId: string): Promise<ChallengeStats> {
    const participants = await this.getChallengeParticipants(challengeId);
    
    const total_participants = participants.length;
    const top_score = participants.length > 0 ? participants[0].score : 0;
    const average_score = participants.length > 0 
      ? participants.reduce((sum, p) => sum + p.score, 0) / participants.length 
      : 0;
    const completion_rate = participants.filter(p => p.score > 0).length / total_participants;

    // TODO: Implement daily progress calculation
    const daily_progress: any[] = [];

    return {
      total_participants,
      top_score,
      average_score,
      completion_rate,
      daily_progress,
    };
  }

  /**
   * Delete a challenge (only by creator, only if not started)
   */
  async deleteChallenge(challengeId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const challenge = await this.getChallenge(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.created_by !== user.id) {
      throw new Error('Only challenge creator can delete the challenge');
    }
    if (challenge.status !== 'upcoming') {
      throw new Error('Cannot delete a challenge that has started');
    }

    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', challengeId);

    if (error) throw error;
  }
}

export const challengeService = new ChallengeService();