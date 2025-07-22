import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, Target, Crown, Calendar } from "lucide-react";
import { format } from "date-fns";

interface AchievementCardProps {
  achievement: {
    id: number;
    name: string;
    description: string;
    type: "level_up" | "streak" | "task_completion" | "goal_completion" | "special";
    xpReward: number;
    unlockedAt: string;
    createdAt: string;
  };
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const typeConfig = {
    level_up: {
      icon: Crown,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      label: "Level Up"
    },
    streak: {
      icon: Target,
      color: "text-orange-400", 
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      label: "Streak"
    },
    task_completion: {
      icon: Star,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10", 
      borderColor: "border-blue-500/20",
      label: "Tasks"
    },
    goal_completion: {
      icon: Trophy,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20", 
      label: "Goal"
    },
    special: {
      icon: Crown,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      label: "Special"
    }
  };

  const config = typeConfig[achievement.type];
  const Icon = config.icon;

  return (
    <Card className={`github-secondary border-github-border ${config.bgColor} ${config.borderColor} hover:border-opacity-50 transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-primary truncate">{achievement.name}</h3>
              <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor}`}>
                {config.label}
              </Badge>
            </div>
            
            <p className="text-sm text-secondary mb-2 line-clamp-2">
              {achievement.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-xs text-orange-400">
                <Zap className="w-3 h-3" />
                <span>{achievement.xpReward} XP</span>
              </div>
              
              <div className="flex items-center space-x-1 text-xs text-secondary">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(achievement.unlockedAt), "MMM d")}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}