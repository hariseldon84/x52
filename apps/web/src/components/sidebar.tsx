import Link from 'next/link';
import { Home, Target, CheckSquare, BarChart, Settings, Trophy } from 'lucide-react';

export function Sidebar() {
  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">X52</h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              <NavItem href="/dashboard" icon={<Home className="h-5 w-5" />}>
                Dashboard
              </NavItem>
              <NavItem href="/dashboard/goals" icon={<Target className="h-5 w-5" />}>
                Goals
              </NavItem>
              <NavItem href="/dashboard/tasks" icon={<CheckSquare className="h-5 w-5" />}>
                Tasks
              </NavItem>
              <NavItem href="/dashboard/achievements" icon={<Trophy className="h-5 w-5" />}>
                Achievements
              </NavItem>
              <NavItem href="/dashboard/analytics" icon={<BarChart className="h-5 w-5" />}>
                Analytics
              </NavItem>
              <NavItem href="/dashboard/settings" icon={<Settings className="h-5 w-5" />}>
                Settings
              </NavItem>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex items-center px-4 py-3 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <span className="mr-3 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
        {icon}
      </span>
      {children}
    </Link>
  );
}
