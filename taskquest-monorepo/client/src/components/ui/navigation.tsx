import { Home, Target, CheckSquare, Users, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";

interface NavigationProps {
  currentTab: string;
}

export default function Navigation({ currentTab }: NavigationProps) {
  const [location] = useLocation();

  const isActive = (tab: string, path: string) => {
    return currentTab === tab || location === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 github-secondary border-t github-border px-4 py-2 z-50">
      <div className="flex justify-around">
        <Link href="/">
          <button className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
            isActive("dashboard", "/") ? "text-blue-400" : "text-secondary hover:text-blue-400"
          }`}>
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </button>
        </Link>
        
        <Link href="/goals">
          <button className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
            isActive("goals", "/goals") ? "text-blue-400" : "text-secondary hover:text-blue-400"
          }`}>
            <Target className="w-5 h-5" />
            <span className="text-xs font-medium">Goals</span>
          </button>
        </Link>
        
        <Link href="/tasks">
          <button className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
            isActive("tasks", "/tasks") ? "text-blue-400" : "text-secondary hover:text-blue-400"
          }`}>
            <CheckSquare className="w-5 h-5" />
            <span className="text-xs font-medium">Tasks</span>
          </button>
        </Link>
        
        <Link href="/contacts">
          <button className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
            isActive("contacts", "/contacts") ? "text-blue-400" : "text-secondary hover:text-blue-400"
          }`}>
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">CRM</span>
          </button>
        </Link>
        
        <Link href="/progress">
          <button className={`flex flex-col items-center space-y-1 p-2 transition-colors ${
            isActive("progress", "/progress") ? "text-blue-400" : "text-secondary hover:text-blue-400"
          }`}>
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-medium">Progress</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
