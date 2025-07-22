# TaskQuest Technical Architecture

**Architect:** Winston  
**Version:** 1.0  
**Date:** 2025-07-21  
**Philosophy:** Lean, Cost-Effective, Scalable

---

## 1. Architecture Overview

TaskQuest employs a **lean, modern architecture** designed for rapid development, cost efficiency, and seamless scalability. Our approach prioritizes simplicity without sacrificing functionality, leveraging proven cloud services to minimize operational overhead.

### 1.1 Core Principles
- **Lean Tech Stack**: Minimal dependencies, maximum value
- **Cloud-First**: Leverage managed services to reduce operational complexity
- **Cost-Conscious**: Optimize for startup economics with clear scaling paths
- **Developer Experience**: Fast iteration cycles and simple deployment
- **Multi-Platform Ready**: Shared logic across web and mobile

## 2. Technology Stack

### 2.1 Backend & Database
**Primary Choice: Supabase**
- **Database**: PostgreSQL (managed by Supabase)
- **Authentication**: Supabase Auth with social providers
- **Real-time**: Supabase Realtime for live updates
- **Storage**: Supabase Storage for file uploads
- **Edge Functions**: Supabase Edge Functions for serverless logic

**Why Supabase?**
- Complete backend-as-a-service with PostgreSQL
- Built-in authentication, real-time subscriptions, and file storage
- Generous free tier, predictable pricing
- Excellent TypeScript support and auto-generated APIs
- Row Level Security (RLS) for data protection

### 2.2 Frontend Stack
**Web Application**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (lightweight alternative to Redux)
- **Data Fetching**: TanStack Query + Supabase client
- **Forms**: React Hook Form + Zod validation

**Mobile Applications**
- **Framework**: Expo (React Native)
- **Navigation**: Expo Router
- **State Management**: Zustand (shared with web)
- **UI Components**: NativeBase or Tamagui
- **Offline Support**: Expo SQLite + sync with Supabase

### 2.3 Deployment & Infrastructure
**Web Deployment: Vercel**
- **Hosting**: Vercel for Next.js application
- **CDN**: Global edge network included
- **Serverless Functions**: Vercel Functions for API routes
- **Environment**: Preview deployments for every PR

**Mobile Deployment**
- **Build Service**: Expo Application Services (EAS)
- **Distribution**: App Store and Google Play Store
- **Updates**: Expo Updates for over-the-air updates

## 3. System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │ Marketing Site  │
│   (Next.js)     │    │   (Expo RN)     │    │   (Next.js)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Supabase Cloud       │
                    │  ┌─────────────────────┐  │
                    │  │   PostgreSQL DB     │  │
                    │  │   (Users, Tasks,    │  │
                    │  │   Goals, Contacts)  │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │   Auth Service      │  │
                    │  │   (JWT + Social)    │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │   Realtime Engine   │  │
                    │  │   (Live Updates)    │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │   Edge Functions    │  │
                    │  │   (Business Logic)  │  │
                    │  └─────────────────────┘  │
                    └─────────────────────────────┘
```

## 4. Database Schema Design

### 4.1 Core Tables

```sql
-- Users table (managed by Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  complexity TEXT DEFAULT 'simple' CHECK (complexity IN ('simple', 'medium', 'complex')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table (CRM)
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  role TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'vip')),
  last_contact_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements table
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 Row Level Security (RLS)
All tables implement RLS policies ensuring users can only access their own data:

```sql
-- Example RLS policy for tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);
```

## 5. API Design

### 5.1 Supabase Auto-Generated APIs
Supabase automatically generates RESTful APIs and GraphQL endpoints based on our database schema. This eliminates the need for custom API development.

### 5.2 Custom Edge Functions
For complex business logic, we'll use Supabase Edge Functions:

```typescript
// /supabase/functions/calculate-xp/index.ts
export default async function calculateXP(req: Request) {
  const { taskComplexity, streakBonus } = await req.json();
  
  const baseXP = {
    simple: 25,
    medium: 50,
    complex: 100
  };
  
  const totalXP = baseXP[taskComplexity] + (streakBonus || 0);
  
  return new Response(JSON.stringify({ xp: totalXP }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## 6. Authentication & Security

### 6.1 Authentication Strategy
- **Primary**: Supabase Auth with email/password
- **Social Logins**: Google, GitHub (for developer audience)
- **Mobile**: Biometric authentication as secondary factor
- **Session Management**: JWT tokens with automatic refresh

### 6.2 Security Measures
- **Row Level Security**: Database-level access control
- **HTTPS Everywhere**: TLS encryption for all communications
- **Input Validation**: Zod schemas for all user inputs
- **Rate Limiting**: Supabase built-in rate limiting
- **CORS Configuration**: Restricted to known domains

## 7. Performance & Scalability

### 7.1 Frontend Performance
- **Code Splitting**: Next.js automatic code splitting
- **Image Optimization**: Next.js Image component
- **Caching**: TanStack Query for client-side caching
- **Bundle Analysis**: Regular bundle size monitoring

### 7.2 Database Performance
- **Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Supabase built-in connection pooling
- **Query Optimization**: Use Supabase query analyzer
- **Caching**: Supabase built-in caching layer

### 7.3 Scaling Strategy
- **Horizontal Scaling**: Supabase handles database scaling
- **CDN**: Vercel's global edge network
- **Serverless**: Auto-scaling Vercel functions
- **Mobile**: Expo's infrastructure handles app distribution

## 8. Development Workflow

### 8.1 Local Development
```bash
# Start local Supabase
npx supabase start

# Start Next.js dev server
npm run dev

# Start Expo development
npx expo start
```

### 8.2 Deployment Pipeline
1. **Code Push**: Developer pushes to GitHub
2. **Vercel Deploy**: Automatic deployment to preview URL
3. **Supabase Migration**: Database changes via migration files
4. **Mobile Build**: EAS builds for app stores
5. **Production Deploy**: Merge to main triggers production deployment

## 9. Monitoring & Analytics

### 9.1 Application Monitoring
- **Error Tracking**: Sentry integration
- **Performance**: Vercel Analytics
- **Database**: Supabase built-in monitoring
- **User Analytics**: PostHog (privacy-focused)

### 9.2 Business Metrics
- **User Engagement**: Task completion rates, streak tracking
- **Feature Usage**: CRM adoption, gamification engagement
- **Performance**: Page load times, API response times

## 10. Cost Analysis

### 10.1 Estimated Monthly Costs (1000 active users)
- **Supabase**: $25/month (Pro plan)
- **Vercel**: $20/month (Pro plan)
- **Expo EAS**: $99/month (Production plan)
- **Sentry**: $26/month (Team plan)
- **Total**: ~$170/month

### 10.2 Scaling Costs
- **10K users**: ~$400/month
- **100K users**: ~$1,500/month
- **Revenue break-even**: ~200 Pro subscribers ($9/month)

## 11. Risk Mitigation

### 11.1 Technical Risks
- **Vendor Lock-in**: Supabase is open-source, can self-host if needed
- **Performance**: Database optimization and caching strategies
- **Downtime**: Multi-region deployment options available

### 11.2 Business Risks
- **Cost Overruns**: Usage-based pricing with alerts and limits
- **Security**: Regular security audits and penetration testing
- **Compliance**: GDPR-compliant data handling with Supabase

## 12. Migration Strategy

### 12.1 From Current Stack
If migrating from the existing Express.js setup:
1. **Database Migration**: Export PostgreSQL data to Supabase
2. **Authentication**: Migrate user accounts to Supabase Auth
3. **API Transition**: Gradually replace Express routes with Supabase queries
4. **Frontend Update**: Integrate Supabase client libraries

### 12.2 Future Considerations
- **Microservices**: Can extract specific functions as separate services
- **Multi-tenancy**: Supabase supports organization-level data isolation
- **International**: Supabase has global regions for data locality

---

This architecture provides a solid foundation for TaskQuest that balances simplicity, cost-effectiveness, and scalability. The lean stack approach ensures rapid development while maintaining the flexibility to grow with the product's success.
