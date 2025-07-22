import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import ProgressBar from "@/components/ui/progress-bar";
import AchievementCard from "@/components/ui/achievement-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Target, Star, Trophy, Calendar, Zap } from "lucide-react";

export default function Progress() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ["/api/achievements"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || achievementsLoading || goalsLoading || tasksLoading) {
    return (
      <div className="min-h-screen github-dark flex items-center justify-center">
        <div className="text-primary">Loading progress...</div>
      </div>
    );
  }

  const completedTasks = tasks.filter(task => task.status === 'completed');
  const completedGoals = goals.filter(goal => goal.status === 'completed');
  const activeGoals = goals.filter(goal => goal.status === 'active');

  // Calculate progress statistics
  const totalXPEarned = completedTasks.reduce((sum, task) => sum + task.xpReward, 0);
  const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
  const averageXPPerTask = completedTasks.length > 0 ? totalXPEarned / completedTasks.length : 0;

  // Get next level XP requirement (simple formula: level * 1000)
  const currentLevel = user?.level || 1;
  const nextLevelXP = currentLevel * 1000;
  const currentLevelProgress = user?.totalXP ? (user.totalXP % 1000) / 10 : 0;

  return (
    <div className="min-h-screen github-dark">
      {/* Header */}
      <header className="github-secondary border-b github-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-primary">Progress</h1>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-primary">{user?.totalXP?.toLocaleString()} XP</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-6">
        {/* Level Progress */}
        <Card className="github-secondary border-github-border mb-6">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Zap className="w-5 h-5 mr-2 text-orange-400" />
              Level Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{currentLevel}</span>
                </div>
                <div>
                  <div className="text-lg font-semibold text-primary">Level {currentLevel}</div>
                  <div className="text-sm text-secondary">
                    {Math.floor(currentLevelProgress * 10)} / 1000 XP to next level
                  </div>
                </div>
              </div>
            </div>
            <ProgressBar value={currentLevelProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="github-secondary border-github-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{tasks.length}</div>
              <div className="text-xs text-secondary">Total Tasks</div>
            </CardContent>
          </Card>
          <Card className="github-secondary border-github-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{completedTasks.length}</div>
              <div className="text-xs text-secondary">Completed</div>
            </CardContent>
          </Card>
          <Card className="github-secondary border-github-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{Math.round(completionRate)}%</div>
              <div className="text-xs text-secondary">Completion Rate</div>
            </CardContent>
          </Card>
          <Card className="github-secondary border-github-border">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{user?.currentStreak || 0}</div>
              <div className="text-xs text-secondary">Day Streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Tabs */}
        <Tabs defaultValue="goals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 github-secondary">
            <TabsTrigger value="goals" className="text-primary">
              Goals ({activeGoals.length})
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-primary">
              Achievements ({achievements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="mt-6">
            <Card className="github-secondary border-github-border">
              <CardHeader>
                <CardTitle className="text-primary flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-400" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeGoals.length > 0 ? (
                  activeGoals.map((goal) => {
                    const progress = goal.targetXP > 0 ? (goal.earnedXP / goal.targetXP) * 100 : 0;
                    return (
                      <div key={goal.id} className="github-dark border border-github-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-primary">{goal.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            goal.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            goal.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {goal.priority} priority
                          </span>
                        </div>
                        {goal.description && (
                          <div className="text-sm text-secondary mb-3">{goal.description}</div>
                        )}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-secondary">XP Progress</span>
                            <span className="text-xs font-medium text-orange-400">
                              {goal.earnedXP} / {goal.targetXP} XP
                            </span>
                          </div>
                          <ProgressBar value={Math.min(progress, 100)} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-secondary">
                          <span>
                            {goal.startDate && `Started ${new Date(goal.startDate).toLocaleDateString()}`}
                          </span>
                          <span>
                            {goal.targetDate && `Due ${new Date(goal.targetDate).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-secondary">
                    No active goals. Create your first goal to start tracking progress!
                  </div>
                )}
                
                {completedGoals.length > 0 && (
                  <div className="mt-6">
                    <h5 className="text-sm font-medium text-secondary mb-3">Completed Goals</h5>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{completedGoals.length}</div>
                      <div className="text-xs text-secondary">Goals Completed</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <Card className="github-secondary border-github-border">
              <CardHeader>
                <CardTitle className="text-primary flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-orange-400" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.length > 0 ? (
                  achievements.map((achievement) => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">
                    No achievements yet. Complete tasks and goals to unlock achievements!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* XP Summary */}
        <Card className="github-secondary border-github-border mt-6">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
              XP Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-400">{totalXPEarned.toLocaleString()}</div>
                <div className="text-xs text-secondary">Total XP Earned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{Math.round(averageXPPerTask)}</div>
                <div className="text-xs text-secondary">Avg XP per Task</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <Navigation currentTab="progress" />
    </div>
  );
}
