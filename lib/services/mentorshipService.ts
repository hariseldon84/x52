// Epic 7, Story 7.4: Mentor-Mentee Matching System Service

import { supabase } from '@/lib/supabase';
import type { 
  MentorProfile, 
  MenteeProfile,
  MentorshipRequest,
  MentorshipRelationship,
  MentorshipGoal,
  MentorshipSession,
  CreateMentorProfileRequest,
  CreateMenteeProfileRequest,
  MentorshipFeedback
} from '@/lib/types/social';

export class MentorshipService {
  /**
   * Create or update mentor profile
   */
  async createMentorProfile(data: CreateMentorProfileRequest): Promise<MentorProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const mentorData = {
      ...data,
      user_id: user.id,
      is_available: true,
    };

    const { data: mentor, error } = await supabase
      .from('mentor_profiles')
      .upsert([mentorData])
      .select(`
        *,
        user:profiles!mentor_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          total_xp
        )
      `)
      .single();

    if (error) throw error;
    return mentor;
  }

  /**
   * Create or update mentee profile
   */
  async createMenteeProfile(data: CreateMenteeProfileRequest): Promise<MenteeProfile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const menteeData = {
      ...data,
      user_id: user.id,
      is_seeking: true,
    };

    const { data: mentee, error } = await supabase
      .from('mentee_profiles')
      .upsert([menteeData])
      .select(`
        *,
        user:profiles!mentee_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          total_xp
        )
      `)
      .single();

    if (error) throw error;
    return mentee;
  }

  /**
   * Find available mentors based on expertise and preferences
   */
  async findMentors(options: {
    expertise_areas?: string[];
    availability?: string;
    experience_level?: string;
    limit?: number;
  } = {}): Promise<MentorProfile[]> {
    let query = supabase
      .from('mentor_profiles')
      .select(`
        *,
        user:profiles!mentor_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          total_xp
        ),
        relationships:mentorship_relationships!mentorship_relationships_mentor_id_fkey(
          count
        ),
        reviews:mentorship_feedback!mentorship_feedback_mentor_id_fkey(
          rating
        )
      `)
      .eq('is_available', true);

    if (options.expertise_areas && options.expertise_areas.length > 0) {
      query = query.overlaps('expertise_areas', options.expertise_areas);
    }

    if (options.availability) {
      query = query.contains('availability', [options.availability]);
    }

    if (options.experience_level) {
      query = query.eq('experience_level', options.experience_level);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return data.map(mentor => ({
      ...mentor,
      active_mentees: mentor.relationships?.[0]?.count || 0,
      average_rating: mentor.reviews?.length > 0 
        ? mentor.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / mentor.reviews.length
        : null,
    }));
  }

  /**
   * Find potential mentees for a mentor
   */
  async findMentees(options: {
    goal_areas?: string[];
    experience_level?: string;
    commitment_level?: string;
    limit?: number;
  } = {}): Promise<MenteeProfile[]> {
    let query = supabase
      .from('mentee_profiles')
      .select(`
        *,
        user:profiles!mentee_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          total_xp
        )
      `)
      .eq('is_seeking', true);

    if (options.goal_areas && options.goal_areas.length > 0) {
      query = query.overlaps('goal_areas', options.goal_areas);
    }

    if (options.experience_level) {
      query = query.eq('experience_level', options.experience_level);
    }

    if (options.commitment_level) {
      query = query.eq('commitment_level', options.commitment_level);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  /**
   * Send mentorship request
   */
  async sendMentorshipRequest(
    mentorId: string, 
    message: string,
    goals: string[]
  ): Promise<MentorshipRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if request already exists
    const { data: existing } = await supabase
      .from('mentorship_requests')
      .select('id')
      .eq('mentor_id', mentorId)
      .eq('mentee_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw new Error('You already have a pending request with this mentor');
    }

    const { data, error } = await supabase
      .from('mentorship_requests')
      .insert([{
        mentor_id: mentorId,
        mentee_id: user.id,
        message,
        goals,
        status: 'pending',
      }])
      .select(`
        *,
        mentor:mentor_profiles!mentorship_requests_mentor_id_fkey(
          *,
          user:profiles!mentor_profiles_user_id_fkey(
            id,
            full_name,
            avatar_url
          )
        ),
        mentee:profiles!mentorship_requests_mentee_id_fkey(
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
   * Respond to mentorship request
   */
  async respondToRequest(
    requestId: string, 
    response: 'accepted' | 'declined',
    responseMessage?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: request, error: fetchError } = await supabase
      .from('mentorship_requests')
      .select('*')
      .eq('id', requestId)
      .eq('mentor_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (request.status !== 'pending') {
      throw new Error('Request is no longer pending');
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('mentorship_requests')
      .update({ 
        status: response,
        response_message: responseMessage,
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // If accepted, create mentorship relationship
    if (response === 'accepted') {
      await this.createMentorshipRelationship(request.mentor_id, request.mentee_id, request.goals);
    }
  }

  /**
   * Create mentorship relationship
   */
  private async createMentorshipRelationship(
    mentorId: string, 
    menteeId: string,
    goals: string[]
  ): Promise<MentorshipRelationship> {
    const { data, error } = await supabase
      .from('mentorship_relationships')
      .insert([{
        mentor_id: mentorId,
        mentee_id: menteeId,
        status: 'active',
        goals,
      }])
      .select(`
        *,
        mentor:mentor_profiles!mentorship_relationships_mentor_id_fkey(
          *,
          user:profiles!mentor_profiles_user_id_fkey(
            id,
            full_name,
            avatar_url
          )
        ),
        mentee:profiles!mentorship_relationships_mentee_id_fkey(
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
   * Get user's mentorship requests
   */
  async getMentorshipRequests(type: 'sent' | 'received'): Promise<MentorshipRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const field = type === 'sent' ? 'mentee_id' : 'mentor_id';
    const selectRelation = type === 'sent' ? 
      `mentor:mentor_profiles!mentorship_requests_mentor_id_fkey(
        *,
        user:profiles!mentor_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )` :
      `mentee:profiles!mentorship_requests_mentee_id_fkey(
        id,
        full_name,
        avatar_url
      )`;

    const { data, error } = await supabase
      .from('mentorship_requests')
      .select(`
        *,
        ${selectRelation}
      `)
      .eq(field, user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's mentorship relationships
   */
  async getMentorshipRelationships(role: 'mentor' | 'mentee'): Promise<MentorshipRelationship[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const field = role === 'mentor' ? 'mentor_id' : 'mentee_id';
    const otherRole = role === 'mentor' ? 'mentee' : 'mentor';
    const selectRelation = role === 'mentor' ?
      `mentee:profiles!mentorship_relationships_mentee_id_fkey(
        id,
        full_name,
        avatar_url,
        level,
        total_xp
      )` :
      `mentor:mentor_profiles!mentorship_relationships_mentor_id_fkey(
        *,
        user:profiles!mentor_profiles_user_id_fkey(
          id,
          full_name,
          avatar_url,
          level,
          total_xp
        )
      )`;

    const { data, error } = await supabase
      .from('mentorship_relationships')
      .select(`
        *,
        ${selectRelation}
      `)
      .eq(field, user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create mentorship goal
   */
  async createGoal(
    relationshipId: string,
    title: string,
    description: string,
    targetDate: string
  ): Promise<MentorshipGoal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('mentorship_goals')
      .insert([{
        relationship_id: relationshipId,
        title,
        description,
        target_date: targetDate,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: string, progress: number, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = { progress };
    if (notes) updateData.notes = notes;
    if (progress >= 100) {
      updateData.completed = true;
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('mentorship_goals')
      .update(updateData)
      .eq('id', goalId);

    if (error) throw error;
  }

  /**
   * Schedule mentorship session
   */
  async scheduleSession(
    relationshipId: string,
    scheduledFor: string,
    duration: number,
    topic: string,
    meetingLink?: string
  ): Promise<MentorshipSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('mentorship_sessions')
      .insert([{
        relationship_id: relationshipId,
        scheduled_for: scheduledFor,
        duration_minutes: duration,
        topic,
        meeting_link: meetingLink,
        scheduled_by: user.id,
        status: 'scheduled',
      }])
      .select(`
        *,
        relationship:mentorship_relationships!mentorship_sessions_relationship_id_fkey(
          mentor:mentor_profiles!mentorship_relationships_mentor_id_fkey(
            user:profiles!mentor_profiles_user_id_fkey(
              id,
              full_name,
              avatar_url
            )
          ),
          mentee:profiles!mentorship_relationships_mentee_id_fkey(
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Complete mentorship session
   */
  async completeSession(
    sessionId: string,
    notes: string,
    nextSteps?: string[]
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('mentorship_sessions')
      .update({
        status: 'completed',
        notes,
        next_steps: nextSteps,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  /**
   * Submit mentorship feedback
   */
  async submitFeedback(
    relationshipId: string,
    targetRole: 'mentor' | 'mentee',
    rating: number,
    feedback: string,
    skills_improved?: string[],
    areas_for_improvement?: string[]
  ): Promise<MentorshipFeedback> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get relationship details
    const { data: relationship } = await supabase
      .from('mentorship_relationships')
      .select('mentor_id, mentee_id')
      .eq('id', relationshipId)
      .single();

    if (!relationship) throw new Error('Relationship not found');

    const targetId = targetRole === 'mentor' ? relationship.mentor_id : relationship.mentee_id;

    const { data, error } = await supabase
      .from('mentorship_feedback')
      .insert([{
        relationship_id: relationshipId,
        mentor_id: relationship.mentor_id,
        mentee_id: relationship.mentee_id,
        reviewer_id: user.id,
        target_role: targetRole,
        rating,
        feedback,
        skills_improved,
        areas_for_improvement,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get mentor statistics
   */
  async getMentorStats(mentorId?: string): Promise<{
    total_mentees: number;
    active_relationships: number;
    completed_sessions: number;
    average_rating: number;
    total_hours_mentored: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    const targetMentorId = mentorId || user?.id;
    if (!targetMentorId) throw new Error('User not authenticated');

    const [relationshipsData, sessionsData, feedbackData] = await Promise.all([
      supabase
        .from('mentorship_relationships')
        .select('id, status')
        .eq('mentor_id', targetMentorId),
      
      supabase
        .from('mentorship_sessions')
        .select('duration_minutes, status')
        .eq('relationship_id', 'ANY(SELECT id FROM mentorship_relationships WHERE mentor_id = $1)', targetMentorId)
        .eq('status', 'completed'),
      
      supabase
        .from('mentorship_feedback')
        .select('rating')
        .eq('mentor_id', targetMentorId)
        .eq('target_role', 'mentor')
    ]);

    const relationships = relationshipsData.data || [];
    const sessions = sessionsData.data || [];
    const feedback = feedbackData.data || [];

    return {
      total_mentees: relationships.length,
      active_relationships: relationships.filter(r => r.status === 'active').length,
      completed_sessions: sessions.length,
      average_rating: feedback.length > 0 
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0,
      total_hours_mentored: sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60,
    };
  }

  /**
   * End mentorship relationship
   */
  async endRelationship(
    relationshipId: string,
    reason: string,
    feedback?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('mentorship_relationships')
      .update({
        status: 'completed',
        end_reason: reason,
        end_feedback: feedback,
        ended_at: new Date().toISOString(),
      })
      .eq('id', relationshipId);

    if (error) throw error;
  }

  /**
   * Get matching algorithm suggestions
   */
  async getMatchingSuggestions(role: 'mentor' | 'mentee'): Promise<{
    mentors?: MentorProfile[];
    mentees?: MenteeProfile[];
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (role === 'mentee') {
      // Get user's mentee profile to understand their needs
      const { data: menteeProfile } = await supabase
        .from('mentee_profiles')
        .select('goal_areas, experience_level')
        .eq('user_id', user.id)
        .single();

      if (!menteeProfile) {
        throw new Error('Please create a mentee profile first');
      }

      const mentors = await this.findMentors({
        expertise_areas: menteeProfile.goal_areas,
        limit: 10,
      });

      return { mentors };
    } else {
      // Get user's mentor profile to understand their expertise
      const { data: mentorProfile } = await supabase
        .from('mentor_profiles')
        .select('expertise_areas, experience_level')
        .eq('user_id', user.id)
        .single();

      if (!mentorProfile) {
        throw new Error('Please create a mentor profile first');
      }

      const mentees = await this.findMentees({
        goal_areas: mentorProfile.expertise_areas,
        limit: 10,
      });

      return { mentees };
    }
  }
}

export const mentorshipService = new MentorshipService();