# Epic 2: Gamified Task Management System - User Stories

**Epic:** Gamified Task Management System  
**Priority:** P0 (Must Have)  
**Scrum Master:** Bob  
**Total Story Points:** 42

---

## Story 2.1: Goal Creation and Management
**Story Points:** 8  
**Priority:** High  
**Status:** Database Schema Ready

### User Story
As a user, I want to create and manage goals so that I can organize my high-level objectives and track my progress toward achieving them.

### Implementation Status
- [x] Database schema created for goals, projects, tasks, and XP transactions
- [x] Implemented Row Level Security (RLS) policies for all tables
- [x] Added timestamp triggers for created_at/updated_at
- [x] Set up relationships between goals, projects, and tasks
- [x] Added XP calculation functions and triggers
- [x] Implemented TypeScript types for all entities
- [x] Created API services for task management
- [x] Implemented basic goal listing and creation UI
- [x] Created XP context and hooks for state management
- [x] Built UI components for XP, levels, and streaks

### Acceptance Criteria
- [x] Database schema created for goals, projects, tasks, and XP transactions
- [x] API services implemented for task management
- [x] TypeScript types defined for all entities
- [x] User can create a new goal with title and description (Basic implementation)
- [x] User can set a target date for goal completion (UI exists, needs backend integration)
- [ ] User can edit existing goal details (Partially implemented)
- [x] User can view all their goals in a list/grid view (Basic implementation)
- [x] User can mark goals as active, completed, or paused (Status change implemented)
- [ ] User can delete goals (with confirmation dialog) (Not implemented)
- [ ] Goals display total XP earned from associated projects/tasks (Partially implemented)
- [x] User can see progress percentage based on completed tasks (Basic implementation)

### Technical Notes
- Goals table created with user_id foreign key
- RLS policies implemented for data security
- Timestamp triggers added for automatic updates
- Ready to implement CRUD operations for goals
- XP calculation functions prepared

---

## Story 2.2: Project Creation Under Goals
**Story Points:** 6  
**Priority:** High  
**Status:** Ready for Development

### User Story
As a user, I want to create projects under my goals so that I can break down large objectives into manageable work streams.

### Implementation Status
- [ ] Project creation UI (Not started)
- [ ] Project listing within goals (Not started)
- [ ] Project status management (Partially implemented in backend)
- [ ] Task count and completion percentage (Backend ready, needs UI)

### Acceptance Criteria
- [ ] User can create projects within a specific goal (Not started)
- [ ] Projects have title, description, and status fields (Schema exists, needs UI)
- [ ] User can view all projects within a goal (Not started)
- [ ] User can edit project details (Not started)
- [ ] User can move projects between goals (Not started)
- [ ] User can mark projects as active, completed, or paused (Partially implemented)
- [ ] Projects show task count and completion percentage (Backend ready, needs UI)
- [ ] User can delete projects (with confirmation) (Not started)

### Technical Notes
- Create projects table with goal_id and user_id foreign keys
- Implement hierarchical relationship: Goals → Projects
- Calculate project completion based on task status
- Ensure data consistency when moving projects between goals

---

## Story 2.3: Task Creation with Complexity Levels
**Story Points:** 8  
**Priority:** High  
**Status:** Partially Implemented

### Implementation Status
- [x] Created TaskForm component with all necessary fields
- [x] Implemented form validation with Zod schemas
- [x] Added complexity and priority selection
- [x] Integrated with task service for CRUD operations
- [x] Added due date picker and task description support
- [x] Real-time updates via Supabase subscriptions
- [ ] Bulk task operations (Future)
- [ ] Task attachments (Future)

### User Story
As a user, I want to create tasks with different complexity levels so that I can earn appropriate XP rewards based on the effort required.

### Acceptance Criteria
- [x] User can create tasks within projects
- [x] Tasks have title, description, due date, and priority fields
- [x] User can select complexity level: Simple (25 XP), Medium (50 XP), Complex (100 XP)
- [x] Tasks display expected XP reward before completion
- [x] User can edit task details including complexity
- [x] User can set task priority: Low, Medium, High
- [ ] Tasks can be linked to contacts from CRM (Future)
- [ ] User can add notes and attachments to tasks (Future)

### Technical Notes
- Using React Hook Form for form management
- Zod for schema validation
- Date-fns for date handling
- Task service handles all API calls
- Real-time updates via Supabase subscriptions

### Technical Notes
- Create tasks table with project_id, user_id, and contact_id foreign keys
- Implement XP calculation based on complexity enum
- Store XP values as constants that can be configured
- Validate complexity and priority enum values

---

## Story 2.4: Task Completion and XP Rewards
**Story Points:** 8  
**Priority:** High  
**Status:** In Progress

### Implementation Status
- [x] Created XP calculation logic based on task complexity
- [x] Implemented XP transaction logging
- [x] Added real-time XP updates via Supabase
- [x] Created XP gain notifications
- [ ] Added undo functionality for task completion (In progress)
- [x] Level progression system
- [x] Streak tracking
- [ ] Achievement system (Future)

### User Story
As a user, I want to complete tasks and earn XP so that I feel rewarded for my progress and can see my advancement in the gamification system.

### XP & Leveling System
- [x] XP calculation based on task complexity
- [x] Level progression formula implemented
- [x] Real-time XP updates
- [ ] Level-up notifications (Partially implemented)
- [ ] Achievement system (Future)

### Streak System
- [x] Daily streak tracking
- [x] Streak visualization
- [ ] Streak milestone rewards (Future)
- [ ] Streak notifications (Future)

### Task Completion
- [x] Single task completion with XP
- [ ] Undo completion within 5 minutes (In progress)
- [ ] Bulk completion (Future)
- [ ] Recurring tasks (Future)

### Technical Notes
- Update task status and completed_at timestamp
- Calculate and award XP using Supabase Edge Function
- Update user profile total_xp field
- Implement real-time XP updates using Supabase Realtime
- Add XP transaction logging for audit purposes

---

## Story 2.5: Level Progression System
**Story Points:** 6  
**Priority:** High

### User Story
As a user, I want to advance through levels based on my XP so that I can see my long-term progress and unlock new features.

### Acceptance Criteria
- [ ] User level is calculated automatically based on total XP
- [ ] Level progression follows a defined XP threshold system
- [ ] User receives notification when leveling up
- [ ] User can see current level and XP progress to next level
- [ ] Level progression is displayed visually (progress bar)
- [ ] Higher levels require exponentially more XP
- [ ] User profile displays current level prominently
- [ ] Level achievements are recorded in achievement system

### Technical Notes
- Implement level calculation algorithm (e.g., level = floor(sqrt(total_xp / 100)))
- Create level progression thresholds
- Update user level automatically when XP changes
- Send level-up notifications via real-time system
- Store level progression history for analytics

---

## Story 2.6: Daily Streak Tracking
**Story Points:** 6  
**Priority:** Medium  
**Status:** In Progress

### User Story
As a user, I want to maintain daily streaks by completing tasks so that I stay motivated to work consistently every day.

### Implementation Details
- Created `StreakService` for streak-related database operations
- Implemented `useStreak` React hook for easy integration
- Created `StreakBadge` component for displaying streak count
- Added TypeScript types for database schema
- Implemented timezone-aware streak calculation

### Acceptance Criteria
- [x] System tracks consecutive days of task completion
- [x] Streak counter increases when user completes at least one task per day
- [x] Streak resets to 0 if user misses a day
- [x] User can see current streak and longest streak
- [ ] Streak milestones trigger bonus XP rewards
- [x] Streak progress is displayed on dashboard (via StreakBadge component)
- [x] System handles timezone differences correctly
- [ ] Streak notifications remind users to maintain momentum

### Technical Notes
- Uses Supabase for data persistence
- Tracks `last_activity_date` in user_streaks table
- Handles timezone differences using UTC dates
- Provides React hooks for easy UI integration
- Handle timezone conversion for accurate daily tracking
- Implement streak bonus XP calculations
- Use scheduled functions to check and update streaks daily
- Store streak history for analytics and achievements

---

## Definition of Done

### Implementation
- [ ] All acceptance criteria met for each story
- [ ] Code follows project conventions and patterns
- [ ] Proper error handling and user feedback
- [ ] Accessibility (a11y) standards met
- [ ] Mobile responsiveness verified

### Testing
- [ ] Unit tests for all components and hooks
- [ ] Integration tests for user flows
- [ ] XP calculations verified
- [ ] Real-time sync tested across devices
- [ ] Performance tested with large datasets

### Documentation
- [ ] Code documentation (JSDoc/TSDoc)
- [ ] User documentation (help/onboarding)
- [ ] API documentation

### Quality Assurance
- [ ] Code review completed
- [ ] UX/UI review completed
- [ ] Cross-browser testing
- [ ] Security review completed

### Deployment
- [ ] Database migrations tested
- [ ] Deployment runbook updated
- [ ] Rollback plan in place
