# X52

X52 is a gamified productivity platform that combines task management with game mechanics to make productivity fun and engaging.

## 📊 Project Status

### 🎯 Current Focus
- Implementing Epic 2: Gamified Task Management System
- Setting up database schema for tasks, projects, and goals

### ✅ Completed
- **Epic 1: Core Authentication & User Management**
  - User registration with email/password
  - Email verification
  - Password reset functionality
  - Session management and security
  - Protected routes

### 🚧 In Progress
- **Epic 2: Gamified Task Management System**
  - Database schema design
  - API endpoints for task management
  - UI components for task creation/management
  - XP reward system

### 📅 Upcoming
- Social Authentication (Google/GitHub)
- User Profile Management
- Mobile App Development
- Team Collaboration Features

## 📈 Progress Tracking

### Recent Updates
- **2024-07-23**: Completed authentication flow (login, registration, password reset)
- **2024-07-22**: Set up Supabase integration and database schema
- **2024-07-21**: Initialized project structure and configuration

### Next Milestones
1. Complete task management core functionality
2. Implement XP and leveling system
3. Add social authentication
4. Develop mobile app interface

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8.9.0+
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the required environment variables
4. Start the development server:
   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
.
├── apps/
│   ├── web/          # Next.js web application
│   └── mobile/       # React Native mobile app (coming soon)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── config/       # Shared configurations
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utility functions
├── scripts/          # Development and build scripts
└── docs/             # Project documentation
```

## 🛠 Development

- `pnpm dev` - Start development servers
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Lint all files
- `pnpm format` - Format all files with Prettier

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
