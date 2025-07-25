// Epic 7: Social & Community Features - Type Definitions

export interface Challenge {
  id: string;
  created_by: string;
  name: string;
  description?: string;
  challenge_type: 'most_xp' | 'most_tasks' | 'longest_streak' | 'custom';
  rules: Record<string, any>;
  start_date: string;
  end_date: string;
  max_participants: number;
  is_public: boolean;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  prize_xp: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  participant_count?: number;
  is_participant?: boolean;
  user_rank?: number;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  score: number;
  rank?: number;
  is_winner: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ChallengeInvitation {
  id: string;
  challenge_id: string;
  invited_by: string;
  invited_user?: string;
  email?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  challenge?: Challenge;
  inviter?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Guild {
  id: string;
  created_by: string;
  name: string;
  description?: string;
  is_public: boolean;
  max_members: number;
  member_count: number;
  rules?: string;
  avatar_url?: string;
  banner_url?: string;
  tags: string[];
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Joined data
  creator?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  user_role?: 'owner' | 'admin' | 'moderator' | 'member';
  is_member?: boolean;
}

export interface GuildMember {
  id: string;
  guild_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joined_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface GuildDiscussion {
  id: string;
  guild_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface GuildDiscussionReply {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  reply_to?: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  parent_reply?: GuildDiscussionReply;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
  
  // Joined data
  requester?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  addressee?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  friend?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Mentorship {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  areas_of_focus: string[];
  goals?: string;
  meeting_frequency: string;
  start_date: string;
  end_date?: string;
  rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  mentor?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  mentee?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface MentorProfile {
  id: string;
  user_id: string;
  bio?: string;
  expertise_areas: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  availability: Record<string, any>;
  max_mentees: number;
  current_mentees: number;
  is_accepting_mentees: boolean;
  hourly_rate?: number;
  response_time: string;
  languages: string[];
  timezone?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface SocialActivity {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  visibility: 'public' | 'friends' | 'private';
  like_count: number;
  comment_count: number;
  created_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  is_liked?: boolean;
}

export interface SocialActivityLike {
  id: string;
  activity_id: string;
  user_id: string;
  created_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface SocialActivityComment {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  
  // Joined data
  follower?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
  following?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Leaderboard {
  id: string;
  name: string;
  category: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: string;
  leaderboard_id: string;
  user_id: string;
  rank: number;
  score: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
  };
}

// API Request/Response Types
export interface CreateChallengeRequest {
  name: string;
  description?: string;
  challenge_type: 'most_xp' | 'most_tasks' | 'longest_streak' | 'custom';
  rules?: Record<string, any>;
  start_date: string;
  end_date: string;
  max_participants?: number;
  is_public?: boolean;
  prize_xp?: number;
}

export interface InviteToChallengeRequest {
  challenge_id: string;
  invitees: Array<{
    user_id?: string;
    email?: string;
  }>;
}

export interface CreateGuildRequest {
  name: string;
  description?: string;
  is_public?: boolean;
  max_members?: number;
  rules?: string;
  tags?: string[];
}

export interface CreateDiscussionRequest {
  guild_id: string;
  title: string;
  content: string;
}

export interface CreateMentorProfileRequest {
  bio?: string;
  expertise_areas: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  availability?: Record<string, any>;
  max_mentees?: number;
  is_accepting_mentees?: boolean;
  hourly_rate?: number;
  response_time?: string;
  languages?: string[];
  timezone?: string;
}

export interface RequestMentorshipRequest {
  mentor_id: string;
  areas_of_focus: string[];
  goals?: string;
  meeting_frequency?: string;
}

export interface CreateSocialActivityRequest {
  activity_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  visibility?: 'public' | 'friends' | 'private';
}

// Challenge Scoring Types
export interface ChallengeScore {
  user_id: string;
  score: number;
  rank: number;
  details: Record<string, any>;
}

export interface ChallengeStats {
  total_participants: number;
  top_score: number;
  average_score: number;
  completion_rate: number;
  daily_progress: Array<{
    date: string;
    total_score: number;
    participant_count: number;
  }>;
}

// Social Feed Types
export interface SocialFeedItem extends SocialActivity {
  type: 'activity' | 'achievement' | 'challenge_win' | 'level_up' | 'streak_milestone';
  can_like: boolean;
  can_comment: boolean;
  comments?: SocialActivityComment[];
}

export interface SocialStats {
  friends_count: number;
  followers_count: number;
  following_count: number;
  activities_count: number;
  guilds_count: number;
  challenges_won: number;
  mentorships_active: number;
}