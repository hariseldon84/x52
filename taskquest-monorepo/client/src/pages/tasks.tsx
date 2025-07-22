import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import TaskItem from "@/components/ui/task-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Tasks() {
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

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || tasksLoading) {
    return (
      <div className="min-h-screen github-dark flex items-center justify-center">
        <div className="text-primary">Loading tasks...</div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingTasks = filteredTasks.filter(task => task.status === "pending");
  const completedTasks = filteredTasks.filter(task => task.status === "completed");

  return (
    <div className="min-h-screen github-dark">
      {/* Header */}
      <header className="github-secondary border-b github-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-primary">Tasks</h1>
          <Button 
            size="sm"
            className="bg-accent-blue hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
            <Input
              placeholder="Search tasks..."
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
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
              className={statusFilter === "pending" ? "bg-accent-orange" : "border-github-border"}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("completed")}
              className={statusFilter === "completed" ? "bg-green-600" : "border-github-border"}
            >
              Completed
            </Button>
          </div>
        </div>

        {/* Task Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 github-secondary">
            <TabsTrigger value="pending" className="text-primary">
              Pending ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-primary">
              Completed ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <Card className="github-secondary border-github-border">
              <CardHeader>
                <CardTitle className="text-primary">Pending Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTasks.length > 0 ? (
                  pendingTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">
                    {searchTerm ? "No pending tasks match your search." : "No pending tasks. Great job!"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <Card className="github-secondary border-github-border">
              <CardHeader>
                <CardTitle className="text-primary">Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedTasks.length > 0 ? (
                  completedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary">
                    {searchTerm ? "No completed tasks match your search." : "No completed tasks yet. Start completing tasks to see them here!"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Task Stats */}
        <Card className="github-secondary border-github-border mt-6">
          <CardHeader>
            <CardTitle className="text-primary">Task Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">{tasks.length}</div>
                <div className="text-xs text-secondary">Total Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">{pendingTasks.length}</div>
                <div className="text-xs text-secondary">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{completedTasks.length}</div>
                <div className="text-xs text-secondary">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <Button 
          size="lg"
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <Navigation currentTab="tasks" />
    </div>
  );
}
