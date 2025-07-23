# 🚀 X52 - Gamified Productivity Platform

X52 is an innovative productivity platform that transforms task management into an engaging, game-like experience. By combining powerful project management tools with gamification mechanics, X52 helps users stay motivated, track progress, and achieve their goals through an intuitive and rewarding interface.

## ✨ Key Features

### 🎮 Gamification Layer
- **XP (Experience Points) System**: Earn XP for completing tasks and achieving goals
- **Level Progression**: Level up as you accumulate XP, unlocking new features and rewards
- **Streaks & Milestones**: Build and maintain daily streaks for consistent productivity
- **Achievements & Badges**: Earn recognition for completing challenges and reaching milestones
- **Leaderboards**: Compete with friends or colleagues in productivity challenges

### 📋 Task Management
- **Hierarchical Organization**: Organize work into Goals > Projects > Tasks
- **Smart Task Creation**: Quick add, detailed task creation, and bulk operations
- **Due Dates & Reminders**: Never miss a deadline with smart notifications
- **Priority & Labels**: Categorize and prioritize work effectively
- **Subtasks & Checklists**: Break down complex tasks into manageable steps

### 🎯 Goal Setting & Tracking
- **Goal Creation**: Define clear objectives with target dates and XP rewards
- **Progress Visualization**: Track goal completion with intuitive progress bars and metrics
- **Project Association**: Link multiple projects to each goal for better organization
- **Status Management**: Mark goals as active, completed, or on hold

### 📊 Analytics & Insights
- **Productivity Analytics**: Visualize your productivity trends over time
- **XP History**: Track your XP earnings and level progression
- **Task Completion Rates**: Monitor your completion rates and identify patterns
- **Time Tracking**: (Future) Track time spent on tasks and projects

## 🏗️ System Architecture

### Frontend
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with custom styling
- **State Management**: React Query for server state, Context API for global state
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router for seamless navigation

### Backend
- **Authentication**: Supabase Auth with email/password and social providers
- **Database**: PostgreSQL with Row Level Security (RLS)
- **API**: RESTful API built with Node.js and Express
- **Real-time Updates**: Supabase Realtime for live data synchronization

## 📋 Epics & Stories

| Epic | Status | Points | Progress |
|------|--------|--------|----------|
| **1. Core Authentication & User Management** | 🟢 Completed | 34 | 100% |
| **2. Gamified Task Management System** | 🟡 In Progress | 42 | 65% |
| **3. Social & Collaboration** | 🟣 Planned | 28 | 0% |
| **4. Mobile Application** | 🟣 Planned | 45 | 0% |
| **5. Advanced Analytics** | 🟣 Planned | 22 | 0% |
| **6. Integration & API** | 🟣 Planned | 18 | 0% |
| **7. Notifications System** | 🟣 Planned | 15 | 0% |
| **8. Admin Dashboard** | 🟣 Planned | 20 | 0% |
| **9. Internationalization** | 🟣 Planned | 12 | 0% |
| **10. Marketing Website** | 🟣 Planned | 10 | 0% |

## 🚀 Implementation Status

### 🔐 Authentication & User Management (100% Complete)
- [x] User registration with email/password
- [x] Email verification flow
- [x] Password reset functionality
- [x] Protected routes and session management
- [x] Basic user profile management

### 🎯 Gamified Task Management (65% Complete)
#### Goals Module
- [x] Goal creation and listing
- [x] Goal status management (active/completed/paused)
- [x] XP tracking and progress visualization
- [ ] Goal sharing and collaboration

#### Projects Module
- [x] Project creation and management
- [x] Project status tracking
- [x] Task count and completion percentage
- [x] Project movement between goals
- [ ] Project templates

#### Tasks Module
- [x] Basic task CRUD operations
- [x] Task prioritization
- [ ] Task dependencies
- [ ] Recurring tasks
- [ ] Bulk task operations

### 🎮 Gamification Layer (40% Complete)
- [x] XP calculation and tracking
- [x] Basic level progression
- [x] Streak tracking
- [ ] Achievement system
- [ ] Leaderboards
- [ ] Customizable rewards

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8.9.0+
- PostgreSQL 14+
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hariseldon84/x52.git
   cd x52
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Update the environment variables in .env
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

## 📄 License

Copyright (C) 2024 Anand Arora. All rights reserved.

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.

## 📧 Contact

For any inquiries, please reach out to [your-email@example.com](mailto:your-email@example.com).

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
