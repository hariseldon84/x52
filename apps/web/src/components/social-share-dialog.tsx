'use client';

import { useState } from 'react';
import { AchievementWithStatus } from './achievement-gallery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, Twitter, Facebook, Linkedin, Link, Copy, Check, Smartphone 
} from 'lucide-react';
import { 
  shareAchievement, 
  generateShareableContent, 
  shareWithWebAPI, 
  copyShareLink,
  trackAchievementShare 
} from '@/lib/social-sharing';
import { createClient } from '@/utils/supabase/client';

interface SocialShareDialogProps {
  achievement: AchievementWithStatus;
  isOpen: boolean;
  onClose: () => void;
}

export function SocialShareDialog({ achievement, isOpen, onClose }: SocialShareDialogProps) {
  const [userMessage, setUserMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  
  const supabase = createClient();
  
  // Generate preview content
  const shareContent = generateShareableContent(achievement, userMessage);

  const handleShare = async (platform: 'linkedin' | 'twitter' | 'facebook') => {
    setIsSharing(true);
    
    try {
      // Update database to mark as shared
      await updateShareStatus(platform);
      
      // Share on platform
      shareAchievement({
        achievement,
        userMessage,
        platform
      });
      
      // Track analytics
      trackAchievementShare(achievement, platform, true);
      
      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error sharing achievement:', error);
      trackAchievementShare(achievement, platform, false);
    } finally {
      setIsSharing(false);
    }
  };

  const handleWebShare = async () => {
    const success = await shareWithWebAPI(shareContent);
    if (success) {
      await updateShareStatus('mobile');
      trackAchievementShare(achievement, 'mobile', true);
      onClose();
    }
  };

  const handleCopyLink = async () => {
    const success = await copyShareLink(shareContent);
    if (success) {
      setCopiedToClipboard(true);
      await updateShareStatus('clipboard');
      trackAchievementShare(achievement, 'clipboard', true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedToClipboard(false);
      }, 2000);
    }
  };

  const updateShareStatus = async (platform: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !achievement.user_achievement) return;

      // Update user_achievements table to mark as shared
      const currentPlatforms = achievement.user_achievement.share_platforms || [];
      const updatedPlatforms = [...new Set([...currentPlatforms, platform])];

      await supabase
        .from('user_achievements')
        .update({
          is_shared: true,
          shared_at: new Date().toISOString(),
          share_platforms: updatedPlatforms
        })
        .eq('id', achievement.user_achievement.id);

    } catch (error) {
      console.error('Error updating share status:', error);
    }
  };

  const previewText = `${shareContent.title}\n\n${shareContent.description}`;
  const isAlreadyShared = achievement.user_achievement?.is_shared || false;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Achievement</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Achievement Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{achievement.title}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{achievement.rarity}</Badge>
                <Badge variant="outline">{achievement.category}</Badge>
                {isAlreadyShared && (
                  <Badge className="bg-green-100 text-green-800">
                    Previously Shared
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-2">{achievement.description}</p>
              <div className="flex items-center space-x-1 text-yellow-600">
                <span className="text-sm font-medium">
                  +{achievement.user_achievement?.xp_earned || 0} XP earned
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Add a personal message (optional)</Label>
            <Textarea
              id="message"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Add your own message to personalize this share..."
              rows={3}
              maxLength={280}
            />
            <p className="text-xs text-gray-500">
              {userMessage.length}/280 characters
            </p>
          </div>

          {/* Share Preview */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 whitespace-pre-line">
                {previewText}
              </div>
              <div className="mt-2 text-xs text-blue-600">
                {shareContent.shareUrl}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {shareContent.hashtags.map(tag => (
                  <span key={tag} className="text-xs text-blue-600">
                    #{tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sharing Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Share on social media</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => handleShare('linkedin')}
                disabled={isSharing}
                className="flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800"
              >
                <Linkedin className="h-4 w-4" />
                <span>LinkedIn</span>
              </Button>
              
              <Button
                onClick={() => handleShare('twitter')}
                disabled={isSharing}
                className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600"
              >
                <Twitter className="h-4 w-4" />
                <span>Twitter</span>
              </Button>
              
              <Button
                onClick={() => handleShare('facebook')}
                disabled={isSharing}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Facebook className="h-4 w-4" />
                <span>Facebook</span>
              </Button>
            </div>

            {/* Alternative sharing options */}
            <div className="flex flex-col sm:flex-row gap-2">
              {navigator.share && (
                <Button
                  onClick={handleWebShare}
                  variant="outline"
                  className="flex items-center justify-center space-x-2 flex-1"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Share via Mobile</span>
                </Button>
              )}
              
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="flex items-center justify-center space-x-2 flex-1"
              >
                {copiedToClipboard ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Share Benefits */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Share2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Why share your achievements?</h4>
                  <ul className="text-sm text-blue-800 mt-1 space-y-1">
                    <li>• Inspire others to build better productivity habits</li>
                    <li>• Celebrate your progress publicly</li>
                    <li>• Help grow the TaskQuest community</li>
                    <li>• Showcase your commitment to personal growth</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}