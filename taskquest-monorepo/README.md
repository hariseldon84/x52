# TaskQuest - Gamified Productivity Web App

A modern, gamified productivity application that combines task management with Personal CRM functionality. Built with React, TypeScript, and Express.js with a beautiful GitHub-inspired dark theme.

## 🚀 Features

### 📊 Gamified Task Management
- **XP System**: Earn experience points for completing tasks
- **Levels & Progression**: User levels based on total XP earned
- **Streak Tracking**: Daily engagement monitoring
- **Achievements**: Unlock rewards for various accomplishments
- **Task Complexity**: Simple (25 XP), Medium (50 XP), Complex (100 XP)

### 🎯 Goal & Project Organization
- **Hierarchical Structure**: Goals → Projects → Tasks
- **Progress Tracking**: Visual progress bars and completion stats
- **Priority Management**: High, Medium, Low priority levels
- **Due Date Tracking**: Keep track of deadlines

### 👥 Personal CRM
- **Contact Management**: Store and organize important contacts
- **Relationship Tracking**: Monitor interaction history
- **Task Linking**: Connect tasks to specific contacts
- **Priority Contacts**: Highlight important relationships

### 🎨 Modern UI/UX
- **Dark Theme**: GitHub-inspired design with blue, orange, and crimson accents
- **Responsive Design**: Works great on mobile and desktop
- **Intuitive Navigation**: Clean 5-tab navigation system
- **Accessibility**: Built with Radix UI components

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Radix UI** + **shadcn/ui** for components
- **Tailwind CSS** for styling
- **React Hook Form** + **Zod** for form validation

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** for database operations
- **PostgreSQL** (Neon) for data storage
- **Replit Auth** for authentication
- **Session-based auth** with PostgreSQL store

## 🎮 How It Works

1. **Authentication**: Sign in with Replit Auth
2. **Dashboard**: View your progress, daily goals, and quick stats
3. **Goals**: Create and manage high-level objectives
4. **Tasks**: Break down work into actionable items
5. **CRM**: Manage contacts and relationships
6. **Progress**: Track your XP, levels, and achievements

## 📱 Pages

- **Dashboard**: Overview of your progress and quick actions
- **Goals**: Manage your objectives and view progress
- **Tasks**: View and complete your to-do items
- **CRM**: Manage contacts and relationships
- **Progress**: Track gamification stats and achievements

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Replit account (for authentication)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd taskquest
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Database
DATABASE_URL=your_postgresql_url

# Authentication
SESSION_SECRET=your_session_secret
REPL_ID=your_repl_id
ISSUER_URL=https://replit.com/oidc
```

4. Push database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## 📊 Database Schema

- **Users**: Core user data with gamification stats
- **Goals**: Top-level objectives with XP tracking
- **Projects**: Organized work under goals
- **Tasks**: Individual actionable items
- **Contacts**: CRM functionality
- **Daily Goals**: Daily objective tracking
- **Achievements**: Gamification rewards
- **Sessions**: Authentication storage

## 🎯 XP System

- **Simple Tasks**: 25 XP
- **Medium Tasks**: 50 XP  
- **Complex Tasks**: 100 XP
- **Daily Goals**: Bonus XP for consistency
- **Achievements**: Various XP rewards

## 🎨 Design System

The app uses a custom dark theme inspired by GitHub with:
- **Primary Colors**: Blue (#3b82f6), Orange (#f97316), Crimson (#dc2626)
- **Background**: Dark gray tones
- **Typography**: Clean, readable fonts
- **Components**: Consistent spacing and hover effects

## 🚀 Deployment

This app is designed for Replit deployment:

1. The frontend builds to `dist/public`
2. The backend bundles to `dist/index.js`
3. Database migrations handled through Drizzle Kit
4. Environment variables configured in Replit Secrets

## 📄 License

MIT License - feel free to use this project for your own productivity needs!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for productivity enthusiasts who want to gamify their workflow.