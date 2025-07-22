import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/ui/navigation";
import GoalCard from "@/components/ui/goal-card";
import TaskItem from "@/components/ui/task-item";
import ContactItem from "@/components/ui/contact-item";
import ProgressBar from "@/components/ui/progress-bar";
import AchievementCard from "@/components/ui/achievement-card";
import AddTaskDialog from "@/components/ui/add-task-dialog";
import AddContactDialog from "@/components/ui/add-contact-dialog";
import AddGoalDialog from "@/components/ui/add-goal-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Calendar, Star, ArrowRight, Bell, Target, CheckSquare, Users } from "lucide-react";

export default function Dashboard() {
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

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || dashboardLoading || !dashboardData) {
    return (
      <div className="min-h-screen github-dark flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  const { 
    user: userData = {}, 
    dailyGoal = {}, 
    activeGoals = [], 
    recentTasks = [], 
    priorityContacts = [], 
    recentAchievements = [] 
  } = dashboardData || {};
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const dailyProgress = dailyGoal ? (dailyGoal.earnedXP / dailyGoal.targetXP) * 100 : 0;
  const completedTasksToday = recentTasks.filter((task: any) => 
    task.status === 'completed' && 
    task.completedAt && new Date(task.completedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="min-h-screen github-dark">
      {/* Header */}
      <header className="github-secondary border-b github-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src={userData.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"}
                alt="User Avatar" 
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-400"
              />
              <div className="absolute -bottom-1 -right-1 bg-accent-orange text-xs font-bold text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-[var(--github-dark)]">
                <span>{userData.level}</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">
                {userData.firstName ? `${userData.firstName} ${userData.lastName || ''}` : userData.email}
              </h1>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-orange-400" />
                  <span className="text-sm text-secondary">{userData.totalXP.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>
          <button className="text-secondary hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-6 space-y-6">
        {/* Daily Goal Card */}
        <Card className="github-secondary border-github-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary">Today's Quest</h2>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-secondary">{today}</span>
              </div>
            </div>
            
            {/* XP Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-secondary">XP Progress</span>
                <span className="text-sm font-medium text-orange-400">
                  {dailyGoal?.earnedXP || 0} / {dailyGoal?.targetXP || 500} XP
                </span>
              </div>
              <ProgressBar 
                value={dailyProgress} 
                className="h-3" 
              />
            </div>

            {/* Daily Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{completedTasksToday}</div>
                <div className="text-xs text-secondary">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {recentTasks.filter((task: any) => task.status === 'pending').length}
                </div>
                <div className="text-xs text-secondary">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{userData.currentStreak}</div>
                <div className="text-xs text-secondary">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <AddTaskDialog>
            <Button className="bg-accent-blue hover:bg-blue-600 text-white p-4 h-auto w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </AddTaskDialog>
          <AddContactDialog>
            <Button className="bg-accent-orange hover:bg-orange-600 text-white p-4 h-auto w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </AddContactDialog>
        </div>

        {/* Active Goals */}
        <Card className="github-secondary border-github-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-primary">Active Goals</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeGoals.length > 0 ? (
              activeGoals.map((goal: any) => (
                <GoalCard key={goal.id} goal={goal} />
              ))
            ) : (
              <div className="text-center py-8 text-secondary">
                No active goals. Create your first goal to get started!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="github-secondary border-github-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-primary">Recent Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.slice(0, 5).map((task: any) => (
                <TaskItem key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-8 text-secondary">
                No tasks yet. Create your first task to start earning XP!
              </div>
            )}
          </CardContent>
        </Card>

        {/* CRM Highlights */}
        <Card className="github-secondary border-github-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-primary">CRM Highlights</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityContacts.length > 0 ? (
              priorityContacts.map((contact: any) => (
                <ContactItem key={contact.id} contact={contact} />
              ))
            ) : (
              <div className="text-center py-8 text-secondary">
                No priority contacts. Add contacts to start building your network!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        <Card className="github-secondary border-github-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-primary">Recent Achievements</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAchievements.length > 0 ? (
              recentAchievements.map((achievement: any) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))
            ) : (
              <div className="text-center py-8 text-secondary">
                No achievements yet. Complete tasks and goals to unlock achievements!
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="lg"
              className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="github-secondary border-github-border mb-2">
            <AddTaskDialog>
              <DropdownMenuItem className="text-primary hover:bg-blue-500/10 cursor-pointer">
                <CheckSquare className="w-4 h-4 mr-2" />
                Add Task
              </DropdownMenuItem>
            </AddTaskDialog>
            <AddGoalDialog>
              <DropdownMenuItem className="text-primary hover:bg-blue-500/10 cursor-pointer">
                <Target className="w-4 h-4 mr-2" />
                Add Goal
              </DropdownMenuItem>
            </AddGoalDialog>
            <AddContactDialog>
              <DropdownMenuItem className="text-primary hover:bg-orange-500/10 cursor-pointer">
                <Users className="w-4 h-4 mr-2" />
                Add Contact
              </DropdownMenuItem>
            </AddContactDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom Navigation */}
      <Navigation currentTab="dashboard" />
    </div>
  );
}
