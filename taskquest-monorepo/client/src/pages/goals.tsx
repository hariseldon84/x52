import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import GoalCard from "@/components/ui/goal-card";
import AddGoalDialog from "@/components/ui/add-goal-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Target } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Goals() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/goals"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || goalsLoading) {
    return (
      <div className="min-h-screen github-dark flex items-center justify-center">
        <div className="text-primary">Loading goals...</div>
      </div>
    );
  }

  const filteredGoals = goals.filter((goal: any) => {
    const matchesSearch = goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         goal.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || goal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeGoals = filteredGoals.filter((goal: any) => goal.status === "active");
  const completedGoals = filteredGoals.filter((goal: any) => goal.status === "completed");
  const pausedGoals = filteredGoals.filter((goal: any) => goal.status === "paused");

  return (
    <div className="min-h-screen github-dark">
      {/* Header */}
      <header className="github-secondary border-b github-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-primary flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-400" />
            Goals
          </h1>
          <AddGoalDialog>
            <Button size="sm" className="bg-accent-blue hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </AddGoalDialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
            <Input
              placeholder="Search goals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 github-secondary border-github-border text-primary"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={statusFilter === "all" ? "bg-accent-blue" : "border-github-border"}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className={statusFilter === "active" ? "bg-green-600" : "border-github-border"}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("completed")}
              className={statusFilter === "completed" ? "bg-blue-600" : "border-github-border"}
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === "paused" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("paused")}
              className={statusFilter === "paused" ? "bg-orange-600" : "border-github-border"}
            >
              Paused
            </Button>
          </div>
        </div>

        {/* Goal Stats */}
        <Card className="github-secondary border-github-border mb-6">
          <CardHeader>
            <CardTitle className="text-primary">Goal Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">{goals.length}</div>
                <div className="text-xs text-secondary">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{activeGoals.length}</div>
                <div className="text-xs text-secondary">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{completedGoals.length}</div>
                <div className="text-xs text-secondary">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">{pausedGoals.length}</div>
                <div className="text-xs text-secondary">Paused</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 github-secondary">
            <TabsTrigger value="active" className="text-primary">
              Active ({activeGoals.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-primary">
              Completed ({completedGoals.length})
            </TabsTrigger>
            <TabsTrigger value="paused" className="text-primary">
              Paused ({pausedGoals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <Card className="github-secondary border-github-border">
              <CardHeader>
                <CardTitle className="text-primary">Active Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeGoals.length > 0 ? (
                  activeGoals.map((goal: any) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">
                    {searchTerm ? "No active goals match your search." : "No active goals. Create your first goal to get started!"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <Card className="github-secondary border-github-border">
              <CardHeader>
                <CardTitle className="text-primary">Completed Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedGoals.length > 0 ? (
                  completedGoals.map((goal: any) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">
                    {searchTerm ? "No completed goals match your search." : "No completed goals yet. Keep working towards your active goals!"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paused" className="mt-6">
            <Card className="github-secondary border-github-border">
              <CardHeader>
                <CardTitle className="text-primary">Paused Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pausedGoals.length > 0 ? (
                  pausedGoals.map((goal: any) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">
                    {searchTerm ? "No paused goals match your search." : "No paused goals."}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Action */}
        <div className="mt-6">
          <AddGoalDialog>
            <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white p-4 h-auto">
              <Plus className="w-5 h-5 mr-2" />
              Create Your Next Goal
            </Button>
          </AddGoalDialog>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <AddGoalDialog>
          <Button 
            size="lg"
            className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </AddGoalDialog>
      </div>

      {/* Bottom Navigation */}
      <Navigation currentTab="goals" />
    </div>
  );
}