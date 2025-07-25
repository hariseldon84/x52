import { AchievementWithStatus } from '@/components/achievement-gallery';

export interface ShareData {
  achievement: AchievementWithStatus;
  userMessage?: string;
  platform: 'linkedin' | 'twitter' | 'facebook';
}

export interface ShareableContent {
  title: string;
  description: string;
  imageUrl: string;
  shareUrl: string;
  hashtags: string[];
}

// Generate shareable content for an achievement
export function generateShareableContent(
  achievement: AchievementWithStatus, 
  userMessage?: string
): ShareableContent {
  const baseTitle = `I just unlocked "${achievement.title}" on TaskQuest!`;
  const title = userMessage ? `${userMessage} - ${baseTitle}` : baseTitle;
  
  const description = [
    achievement.description,
    `Earned ${achievement.user_achievement?.xp_earned || 0} XP`,
    'Join me in building better productivity habits with TaskQuest!'
  ].join(' • ');

  // Generate achievement image URL (this would be a dynamic image service)
  const imageUrl = generateAchievementImageUrl(achievement);
  
  // This would be the actual app URL
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskquest.app'}/achievements/${achievement.id}`;
  
  const hashtags = [
    'TaskQuest',
    'Productivity',
    'Achievement',
    achievement.category,
    achievement.rarity
  ];

  return {
    title,
    description,
    imageUrl,
    shareUrl,
    hashtags
  };
}

// Generate dynamic achievement image URL
function generateAchievementImageUrl(achievement: AchievementWithStatus): string {
  // This would integrate with a service like Bannerbear, Canva API, or custom image generation
  const params = new URLSearchParams({
    title: achievement.title,
    description: achievement.description,
    category: achievement.category,
    rarity: achievement.rarity,
    xp: (achievement.user_achievement?.xp_earned || 0).toString(),
    icon: achievement.icon_name || 'trophy',
  });
  
  // For now, return a placeholder image service URL
  return `${process.env.NEXT_PUBLIC_APP_URL || 'https://taskquest.app'}/api/achievement-image?${params.toString()}`;
}

// Share on LinkedIn
export function shareOnLinkedIn(content: ShareableContent): void {
  const url = new URL('https://www.linkedin.com/sharing/share-offsite/');
  url.searchParams.set('url', content.shareUrl);
  
  window.open(url.toString(), '_blank', 'width=600,height=400');
}

// Share on Twitter
export function shareOnTwitter(content: ShareableContent): void {
  const text = `${content.title}\n\n${content.description}`;
  const hashtags = content.hashtags.join(',');
  
  const url = new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text', text);
  url.searchParams.set('url', content.shareUrl);
  url.searchParams.set('hashtags', hashtags);
  
  window.open(url.toString(), '_blank', 'width=600,height=400');
}

// Share on Facebook
export function shareOnFacebook(content: ShareableContent): void {
  const url = new URL('https://www.facebook.com/sharer/sharer.php');
  url.searchParams.set('u', content.shareUrl);
  url.searchParams.set('quote', `${content.title}\n\n${content.description}`);
  
  window.open(url.toString(), '_blank', 'width=600,height=400');
}

// Generic share function
export function shareAchievement(shareData: ShareData): void {
  const content = generateShareableContent(shareData.achievement, shareData.userMessage);
  
  switch (shareData.platform) {
    case 'linkedin':
      shareOnLinkedIn(content);
      break;
    case 'twitter':
      shareOnTwitter(content);
      break;
    case 'facebook':
      shareOnFacebook(content);
      break;
    default:
      console.error('Unsupported platform:', shareData.platform);
  }
}

// Web Share API fallback for mobile
export async function shareWithWebAPI(content: ShareableContent): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: content.title,
      text: content.description,
      url: content.shareUrl,
    });
    return true;
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
}

// Copy to clipboard
export async function copyShareLink(content: ShareableContent): Promise<boolean> {
  try {
    const shareText = `${content.title}\n\n${content.description}\n\n${content.shareUrl}`;
    await navigator.clipboard.writeText(shareText);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

// Track sharing analytics (would integrate with your analytics service)
export function trackAchievementShare(
  achievement: AchievementWithStatus,
  platform: string,
  success: boolean
): void {
  // This would integrate with your analytics service (Google Analytics, Mixpanel, etc.)
  console.log('Achievement shared:', {
    achievementId: achievement.id,
    achievementTitle: achievement.title,
    platform,
    success,
    timestamp: new Date().toISOString(),
  });
  
  // Example: gtag('event', 'achievement_shared', { ... })
  // Example: mixpanel.track('Achievement Shared', { ... })
}