# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

X52 is a gamified productivity platform built as a monorepo using Next.js, React, TypeScript, and Supabase. The system transforms task management into an engaging experience through XP systems, achievements, and social features.

### Core System Architecture

**Hierarchical Data Model**: Goals → Projects → Tasks
- Users create Goals (high-level objectives)
- Goals contain Projects (organized work streams)  
- Projects contain Tasks (actionable items)
- XP earned from task completion based on complexity (Simple=25XP, Medium=50XP, Complex=100XP)

**Authentication & Data Flow**:
- Supabase handles authentication, database, and real-time updates
- Row Level Security (RLS) ensures users only access their own data
- Real-time subscriptions for live updates across the platform

**Gamification Engine**:
- XP system with automatic level progression
- 45+ achievements with rarity system (Common/Rare/Epic/Legendary)
- Streak tracking for daily productivity
- Social features: challenges, leaderboards, guilds, mentorship

## Development Commands

**Monorepo Management** (uses Turbo and pnpm):
```bash
# Install dependencies
pnpm install

# Start development server (all apps)
pnpm dev

# Start specific app
cd apps/web && pnpm dev

# Build all apps
pnpm build

# Lint all code
pnpm lint

# Format code
pnpm format

# Clean build artifacts
turbo clean
```

**Database Operations**:
```bash
# Reset local database (if using Supabase CLI)
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/supabase.ts

# Create new migration
supabase migration new migration_name

# Apply migrations
supabase migration up
```

**Testing**:
- No test suite currently configured
- Manual testing through development server

## Project Structure

### Monorepo Layout
```
/                          # Root monorepo
├── apps/
│   └── web/              # Next.js web application (primary app)
├── packages/             # Shared packages (minimal)
├── lib/                  # Shared services and utilities
├── components/           # Shared React components
└── supabase/            # Database migrations and schemas
```

### Key Application Areas

**Core Application** (`/apps/web/src/`):
- `/app/` - Next.js App Router pages and API routes
- `/components/` - React components with Radix UI primitives
- `/lib/` - Utilities, Supabase client configuration
- `/types/` - TypeScript type definitions

**Shared Services** (`/lib/services/`):
- Task management, XP calculations, achievements
- Integration services (Slack, Zapier, Calendar, Email)
- AI services (suggestions, priority optimization, predictive analytics)
- Social features (friends, guilds, challenges, mentorship)

**Database Schema** (`/supabase/migrations/`):
- 23+ migration files covering all features
- Core tables: profiles, goals, projects, tasks, xp_transactions
- Advanced features: contacts, achievements, social features, integrations
- AI tables: suggestions, priority_optimization, followups, notifications

## Database Architecture

### Core Tables Structure
```sql
profiles (user data, XP, levels)
├── goals (high-level objectives)
│   └── projects (organized work streams)
│       └── tasks (actionable items with XP)
└── xp_transactions (audit trail of XP earned)
```

### Feature Extensions
- **CRM**: contacts, interaction_history, follow_ups
- **Achievements**: achievements, user_achievements, achievement_goals
- **Social**: challenges, leaderboards, guilds, mentorship
- **Integrations**: calendar_integrations, slack_workspaces, zapier_webhooks
- **AI**: ai_suggestions, priority_optimization, predictive_analytics

### Key Database Functions
- `calculate_task_xp(complexity)` - Returns XP for task complexity
- `update_updated_at_column()` - Automatic timestamp updates
- Achievement tracking triggers for automated badge awarding

## Authentication & Security

**Supabase Auth Integration**:
- Email/password authentication with JWT sessions
- Social providers (Google OAuth configured)
- Demo account system for testing (`demo@x52app.com` / `demo123456`)

**Row Level Security (RLS)**:
- All tables have RLS enabled with `auth.uid()` policies
- Users can only access their own data
- Public data (leaderboards) uses specific view policies

**Security Considerations**:
- Environment variables for sensitive data (Supabase keys, API tokens)
- CSRF protection through Next.js built-ins
- Input validation using Zod schemas

## Key Service Patterns

### Service Architecture
All services follow a consistent pattern:
```typescript
// Located in /lib/services/[feature]Service.ts
export class FeatureService {
  // Supabase client operations
  // Error handling with try/catch
  // Type-safe returns using TypeScript interfaces
}
```

### XP System Integration
XP is automatically calculated and awarded through database triggers:
- Task completion triggers XP calculation based on complexity
- XP transactions are logged for audit trail
- User profiles are updated with total XP and level progression

### Real-time Updates  
Components use Supabase real-time subscriptions:
```typescript
// Pattern for real-time data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);

// Real-time subscription
supabase
  .channel('table_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, 
    (payload) => {
      // Handle real-time updates
    })
  .subscribe();
```

## AI & Integration Features

### AI Services (Epic 9 - Recently Completed)
- **AI Task Suggestions**: ML-powered task recommendations
- **Priority Optimization**: Dynamic task reordering algorithms  
- **Automated Follow-ups**: Intelligent task dependency management
- **Predictive Analytics**: Productivity forecasting and insights
- **Goal Breakdown**: AI-powered goal decomposition

### External Integrations (Epic 8)
- **Calendar**: Google Calendar and Outlook two-way sync
- **Slack**: Bot with slash commands and workspace integration
- **Zapier**: Webhook automation with triggers and actions
- **Email**: Email-to-task conversion with attachment handling
- **Notes**: Notion and Obsidian integration for note linking

### API Patterns
API routes follow Next.js 13+ App Router conventions:
```typescript
// /apps/web/src/app/api/[feature]/route.ts
export async function GET/POST/PUT/DELETE(request: Request) {
  // Authentication check
  // Input validation with Zod
  // Supabase operations
  // Structured JSON response
}
```

## Component Architecture

### UI Component System
- **Base Components**: Radix UI primitives in `/components/ui/`
- **Feature Components**: Domain-specific components in `/components/[feature]/`
- **Page Components**: Next.js page components in `/app/`

### Styling System
- **Tailwind CSS**: Utility-first styling with custom design system
- **Class Variance Authority**: Type-safe component variants
- **Responsive Design**: Mobile-first approach with desktop enhancements

### State Management
- **Server State**: React Query for API data fetching and caching
- **Client State**: React Context API for global state (auth, notifications)
- **Real-time State**: Supabase subscriptions for live data updates

## Development Workflow

### Feature Development Process
1. **Database**: Create migration if schema changes needed
2. **Types**: Update TypeScript interfaces in `/lib/types/`
3. **Service**: Implement business logic in `/lib/services/`
4. **API**: Create API routes in `/app/api/` if needed
5. **Components**: Build UI components with proper typing
6. **Pages**: Integrate components into Next.js pages

### Testing Strategy
- Manual testing through development server
- Database testing via Supabase dashboard
- API testing via Next.js API routes
- Component testing through Storybook (if configured)

### Migration Management
Database migrations are sequential and feature-focused:
- Core tables (profiles, goals, projects, tasks)
- Feature extensions (achievements, social, integrations)
- AI and analytics tables (suggestions, optimization, analytics)

All migrations include proper indexes, constraints, and RLS policies.

## Common Development Tasks

### Adding New Features
1. Plan database schema changes in new migration
2. Update TypeScript types to match schema
3. Implement service layer with proper error handling
4. Create API endpoints following established patterns
5. Build UI components with Radix UI primitives
6. Integrate real-time subscriptions if needed

### Debugging Database Issues
- Check Supabase dashboard for query performance
- Verify RLS policies are correctly applied
- Use `supabase logs` for real-time debugging
- Test queries directly in Supabase SQL editor

### Performance Optimization
- Database: Add indexes for commonly queried columns
- Frontend: Use React.memo for expensive components
- API: Implement caching strategies for heavy operations
- Real-time: Limit subscription scope to necessary data

## Environment Setup

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Integration APIs
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_SIGNING_SECRET=your_slack_signing_secret
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
ZAPIER_WEBHOOK_SECRET=your_zapier_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development Prerequisites
- Node.js 18+
- pnpm 8.9.0+
- Supabase account and project
- Integration API keys (optional for core features)

### Deployment Considerations
- Vercel deployment for Next.js application
- Supabase handles database hosting and management
- Environment variables configured in deployment platform
- Database migrations applied through Supabase CLI or dashboard