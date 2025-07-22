# replit.md

## Overview

TaskQuest is a gamified productivity application that combines task management with CRM functionality. It's built as a full-stack web application using a modern tech stack with TypeScript, featuring a React frontend and Express.js backend, with PostgreSQL database integration through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monolithic full-stack architecture with clear separation between client and server code:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Framework**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom dark theme (GitHub-inspired)
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: express-session with PostgreSQL store

## Key Components

### Database Schema
The application uses a hierarchical goal system:
- **Users**: Core user data with gamification stats (level, XP, streaks)
- **Goals**: Top-level objectives with XP tracking
- **Projects**: Organized work under goals
- **Tasks**: Individual actionable items with XP rewards
- **Contacts**: CRM functionality for relationship management
- **Daily Goals**: Daily objective tracking
- **Achievements**: Gamification rewards system
- **Sessions**: Authentication session storage

### Authentication System
- Integrated Replit Auth using OpenID Connect
- Session-based authentication with PostgreSQL session store
- Automatic redirect handling for unauthorized access
- User profile management with avatar support

### Gamification Features
- XP (Experience Points) system for task completion
- User levels and progression tracking
- Streak counters for daily engagement
- Achievement system with various reward types
- Progress visualization with custom progress bars

### API Structure
RESTful API endpoints organized by feature:
- `/api/auth/*` - Authentication and user management
- `/api/dashboard` - Aggregated dashboard data
- `/api/goals/*` - Goal CRUD operations
- `/api/projects/*` - Project management
- `/api/tasks/*` - Task operations and completion
- `/api/contacts/*` - CRM functionality
- `/api/achievements/*` - Gamification data

## Data Flow

1. **Authentication Flow**: Users authenticate through Replit Auth, sessions stored in PostgreSQL
2. **Dashboard Data**: Aggregated queries fetch user stats, active goals, recent tasks, and priority contacts
3. **Task Completion**: Triggers XP calculation, achievement checks, and progress updates
4. **Real-time Updates**: TanStack Query invalidation ensures UI consistency after mutations
5. **Error Handling**: Unauthorized errors trigger automatic re-authentication

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL with connection pooling
- **Authentication**: Replit Auth service integration
- **UI Components**: Extensive Radix UI component library
- **Icons**: Lucide React icon library
- **Date Handling**: date-fns for date manipulation
- **Form Handling**: React Hook Form with Zod validation

### Development Tools
- **TypeScript**: Full type safety across client and server
- **Vite**: Development server and build tooling
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Production server bundling
- **PostCSS**: CSS processing with Tailwind

## Deployment Strategy

The application is designed for Replit deployment with the following configuration:

### Build Process
1. Frontend builds to `dist/public` using Vite
2. Backend bundles to `dist/index.js` using ESBuild
3. Database migrations handled through Drizzle Kit

### Environment Requirements
- `DATABASE_URL`: PostgreSQL connection string (Neon)
- `SESSION_SECRET`: Session encryption key
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OAuth issuer endpoint

### File Structure
- `/client` - React frontend application
- `/server` - Express.js backend application
- `/shared` - Shared TypeScript types and schemas
- `/migrations` - Database migration files

The architecture prioritizes type safety, developer experience, and maintainability while providing a rich, gamified user experience for productivity management.