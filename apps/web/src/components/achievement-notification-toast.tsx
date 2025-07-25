'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/notification-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Star, X, Party, Sparkles, Crown, Award 
} from 'lucide-react';
import { Database } from '@/types/supabase';
import { motion, AnimatePresence } from 'framer-motion';

type AchievementNotification = Database['public']['Tables']['achievement_notifications']['Row'];

interface ToastNotification extends AchievementNotification {
  achievement?: any; // Achievement details from join
}

export function AchievementNotificationToast() {
  const { notifications } = useNotifications();
  const [activeToasts, setActiveToasts] = useState<ToastNotification[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Monitor for new unlock notifications
  useEffect(() => {
    const newUnlockNotifications = notifications.filter(
      notification => 
        notification.notification_type === 'unlock' &&
        !notification.is_read &&
        !processedIds.has(notification.id)
    );

    if (newUnlockNotifications.length > 0) {
      // Add new notifications to active toasts
      setActiveToasts(prev => [...prev, ...newUnlockNotifications]);
      
      // Mark these as processed to avoid duplicates
      setProcessedIds(prev => {
        const newSet = new Set(prev);
        newUnlockNotifications.forEach(n => newSet.add(n.id));
        return newSet;
      });

      // Auto-remove after 8 seconds
      newUnlockNotifications.forEach(notification => {
        setTimeout(() => {
          removeToast(notification.id);
        }, 8000);
      });
    }
  }, [notifications, processedIds]);

  const removeToast = (notificationId: string) => {
    setActiveToasts(prev => prev.filter(toast => toast.id !== notificationId));
  };

  const getRarityIcon = (rarity?: string) => {
    switch (rarity) {
      case 'legendary':
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 'epic':
        return <Award className="h-6 w-6 text-purple-400" />;
      case 'rare':
        return <Star className="h-6 w-6 text-blue-400" />;
      default:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getRarityColors = (rarity?: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          bg: 'from-yellow-400 via-orange-400 to-red-400',
          border: 'border-yellow-400',
          text: 'text-yellow-900',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'epic':
        return {
          bg: 'from-purple-400 via-pink-400 to-purple-600',
          border: 'border-purple-400',
          text: 'text-purple-900',
          badge: 'bg-purple-100 text-purple-800'
        };
      case 'rare':
        return {
          bg: 'from-blue-400 via-cyan-400 to-blue-600',
          border: 'border-blue-400',
          text: 'text-blue-900',
          badge: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          bg: 'from-green-400 via-emerald-400 to-green-600',
          border: 'border-green-400',
          text: 'text-green-900',
          badge: 'bg-green-100 text-green-800'
        };
    }
  };

  if (activeToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {activeToasts.map((toast, index) => {
          const colors = getRarityColors(toast.achievement?.rarity);
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                delay: index * 0.1 
              }}
              className="relative"
            >
              <Card className={`
                overflow-hidden shadow-2xl ${colors.border} border-2
                bg-gradient-to-br ${colors.bg}
              `}>
                {/* Sparkle animations */}
                <div className="absolute inset-0 pointer-events-none">
                  <Sparkles className="absolute top-2 left-2 h-4 w-4 text-white animate-pulse" />
                  <Sparkles className="absolute top-4 right-4 h-3 w-3 text-white animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <Sparkles className="absolute bottom-3 left-4 h-3 w-3 text-white animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <CardContent className="p-4 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 p-2 bg-white bg-opacity-20 rounded-full">
                        {getRarityIcon(toast.achievement?.rarity)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Party className="h-4 w-4 text-white" />
                          <h3 className="font-bold text-white text-sm">
                            Achievement Unlocked!
                          </h3>
                        </div>
                        
                        <h4 className="font-semibold text-white mb-1">
                          {toast.achievement?.title || 'New Achievement'}
                        </h4>
                        
                        <p className="text-white text-opacity-90 text-xs mb-2">
                          {toast.achievement?.description || toast.message}
                        </p>
                        
                        <div className="flex items-center space-x-2">
                          {toast.achievement?.rarity && (
                            <Badge className={colors.badge}>
                              {toast.achievement.rarity}
                            </Badge>
                          )}
                          
                          <div className="flex items-center space-x-1 text-white">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-xs font-medium">
                              +{toast.achievement?.xp_reward || 0} XP
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeToast(toast.id)}
                      className="h-6 w-6 p-0 text-white hover:bg-white hover:bg-opacity-20"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>

                {/* Progress bar for auto-dismiss */}
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 8, ease: 'linear' }}
                />
              </Card>

              {/* Celebration particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    initial={{ 
                      x: Math.random() * 300 - 150,
                      y: Math.random() * 200 - 100,
                      opacity: 1,
                      scale: 1
                    }}
                    animate={{ 
                      y: [0, -100, -200],
                      x: [0, Math.random() * 100 - 50],
                      opacity: [1, 0.7, 0],
                      scale: [1, 0.5, 0]
                    }}
                    transition={{ 
                      duration: 2,
                      delay: i * 0.2,
                      ease: 'easeOut'
                    }}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}