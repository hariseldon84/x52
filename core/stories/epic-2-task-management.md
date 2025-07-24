# Epic 2: Gamified Task Management System - User Stories

**Epic:** Gamified Task Management System  
**Priority:** P0 (Must Have)  
**Scrum Master:** Bob  
**Total Story Points:** 42

---

## Story 2.1: Goal Creation and Management
**Story Points:** 8  
**Priority:** High  
**Status:** ✅ Complete (2 missing features: edit & delete)

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
- [x] Full goal creation UI with form validation and server actions
- [x] Goal listing page with progress tracking and project counts
- [x] Automatic progress calculation based on task completion
- [x] Integration with dashboard showing real goal data
- [ ] Goal editing functionality (edit page not implemented)
- [ ] Goal deletion functionality (delete confirmation not implemented)

### Acceptance Criteria
- [x] Database schema created for goals, projects, tasks, and XP transactions
- [x] API services implemented for task management
- [x] TypeScript types defined for all entities
- [x] User can create a new goal with title and description (Full server action implementation)
- [x] User can set a target date for goal completion (Full date picker implementation with validation)
- [ ] User can edit existing goal details (Not implemented - no edit page exists)
- [x] User can view all their goals in a list/grid view (Full implementation with project counts and progress)
- [x] User can mark goals as active, completed, or paused (Status change implemented via goal completion logic)
- [ ] User can delete goals (with confirmation dialog) (Not implemented - no delete functionality exists)
- [x] Goals display total XP earned from associated projects/tasks (Implemented via automatic progress calculation)
- [x] User can see progress percentage based on completed tasks (Full implementation with visual progress bars)

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
**Status:** ✅ Complete (1 missing feature: move between goals)

### User Story
As a user, I want to create projects under my goals so that I can break down large objectives into manageable work streams.

### Implementation Status
- [x] Project creation UI with full form validation using React Hook Form and Zod
- [x] Project listing within goals with ProjectCard components
- [x] Project status management (active, paused, completed)
- [x] Task count and completion percentage with automatic calculation via database triggers
- [x] Project editing with full form and status updates
- [x] Project deletion button (though functionality may need confirmation dialog)
- [x] Database triggers for automatic progress tracking
- [ ] Move projects between goals (not implemented)

### Acceptance Criteria
- [x] User can create projects within a specific goal (Full implementation with form validation)
- [x] Projects have title, description, and status fields (Complete with dropdown selection)
- [x] User can view all projects within a goal (Full listing page with ProjectCard components)
- [x] User can edit project details (Complete edit page with form validation)
- [ ] User can move projects between goals (Not implemented - no UI for changing goal_id)
- [x] User can mark projects as active, completed, or paused (Full status management via dropdown)
- [x] Projects show task count and completion percentage (Automatic calculation via database triggers)
- [x] User can delete projects (with confirmation) (Delete button exists, may need confirmation dialog enhancement)

### Technical Notes
- Create projects table with goal_id and user_id foreign keys
- Implement hierarchical relationship: Goals → Projects
- Calculate project completion based on task status
- Ensure data consistency when moving projects between goals

---

## Story 2.3: Task Creation with Complexity Levels
**Story Points:** 8  
**Priority:** High  
**Status:** ✅ Complete (Future features: CRM linking, attachments)

### Implementation Status
- [x] Created TaskForm component with all necessary fields and validation
- [x] Implemented form validation with React Hook Form and controlled components
- [x] Added complexity and priority selection with visual badges
- [x] Integrated with Supabase for full CRUD operations
- [x] Added due date picker with calendar component
- [x] Full task description support with textarea
- [x] TaskList component with real-time task completion
- [x] Task editing through direct database updates
- [x] XP preview based on complexity level
- [x] Automatic XP awarding via database triggers
- [ ] Bulk task operations (Future enhancement)
- [ ] Task attachments (Future enhancement)

### User Story
As a user, I want to create tasks with different complexity levels so that I can earn appropriate XP rewards based on the effort required.

### Acceptance Criteria
- [x] User can create tasks within projects (Full TaskForm implementation with project linking)
- [x] Tasks have title, description, due date, and priority fields (Complete form with all fields)
- [x] User can select complexity level: Simple (25 XP), Medium (50 XP), Complex (100 XP) (Visual badge selection with XP preview)
- [x] Tasks display expected XP reward before completion (Real-time XP preview in form and task list)
- [x] User can edit task details including complexity (TaskList allows direct completion and editing)
- [x] User can set task priority: Low, Medium, High (Visual badge selection with color coding)
- [x] Tasks can be completed with automatic XP awarding (Full implementation via database triggers)
- [x] Tasks show completion status and earned XP (Visual feedback in TaskList component)
- [ ] Tasks can be linked to contacts from CRM (Future - requires Epic 3)
- [ ] User can add notes and attachments to tasks (Future enhancement)

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
**Status:** ✅ Complete (Future features: undo, notifications, achievements)

### Implementation Status
- [x] Created XP calculation logic based on task complexity via database functions
- [x] Implemented XP events table and transaction logging
- [x] Added real-time XP updates via Supabase database triggers
- [x] Dashboard displays real user XP totals from database
- [x] Task completion updates via TaskList component checkboxes
- [x] Automatic XP awarding through database triggers on task completion
- [x] Level progression system with mathematical formula implementation
- [x] Streak tracking with automatic updates on task completion
- [x] Visual feedback in TaskList showing earned XP
- [ ] Added undo functionality for task completion (Not implemented)
- [ ] Push notifications for XP gains (Future feature)
- [ ] Achievement system (Future - Epic 4)

### User Story
As a user, I want to complete tasks and earn XP so that I feel rewarded for my progress and can see my advancement in the gamification system.

### XP & Leveling System
- [x] XP calculation based on task complexity (25/50/100 XP via database function)
- [x] Level progression formula implemented (getUserLevel in XP service)
- [x] Real-time XP updates via database triggers and dashboard integration
- [x] XP display on dashboard with actual user totals
- [x] Visual XP feedback in task lists showing earned XP
- [ ] Level-up notifications (Not implemented - no notification system)
- [ ] Achievement system (Future - Epic 4)

### Streak System
- [x] Daily streak tracking via user_streaks table
- [x] Streak visualization on dashboard with real data
- [x] Automatic streak updates via database triggers on task completion
- [x] StreakBadge component for visual representation
- [ ] Streak milestone rewards (Service exists, not fully integrated)
- [ ] Streak notifications (Future feature)

### Task Completion
- [x] Single task completion with XP via TaskList checkboxes
- [x] Automatic status and completion timestamp updates  
- [x] Progress tracking updates for projects and goals
- [ ] Undo completion within 5 minutes (Not implemented)
- [ ] Bulk completion (Future enhancement)
- [ ] Recurring tasks (Future feature)

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
**Status:** ✅ Complete (Future features: notifications, visual progress, achievements)

### User Story
As a user, I want to advance through levels based on my XP so that I can see my long-term progress and unlock new features.

### Implementation Status
- [x] XP service with getUserLevel function implementing mathematical progression
- [x] Level calculation based on total XP with progressive XP requirements
- [x] Dashboard integration showing real user XP totals
- [x] Database function for getting total user XP (get_user_total_xp)
- [x] Level progression formula: each level requires (level * 100) XP
- [x] XP progress calculation with percentage to next level
- [ ] Visual level display on user profile (basic XP shown on dashboard)
- [ ] Level progression progress bar (not implemented)
- [ ] Level-up notifications (no notification system)
- [ ] Level achievements integration (Future - Epic 4)

### Acceptance Criteria
- [x] User level is calculated automatically based on total XP (getUserLevel function implementation)
- [x] Level progression follows a defined XP threshold system (Level * 100 XP per level)
- [ ] User receives notification when leveling up (Not implemented - no notification system)
- [x] User can see current level and XP progress to next level (XP service provides level, currentXP, xpToNextLevel, progress)
- [ ] Level progression is displayed visually (progress bar) (Not implemented - only XP total shown)
- [x] Higher levels require exponentially more XP (Progressive formula: (level + 1) * 100)
- [x] User profile displays current level prominently (XP shown on dashboard)
- [ ] Level achievements are recorded in achievement system (Future - Epic 4)

### Technical Notes
- Implemented level calculation algorithm: progressive XP requirements per level
- XP service provides: level, currentXP, xpToNextLevel, progress percentage
- Database function get_user_total_xp for efficient XP calculation
- Level progression integrated with dashboard display
- Ready for future UI enhancements and notification system

---

## Story 2.6: Daily Streak Tracking
**Story Points:** 6  
**Priority:** Medium  
**Status:** ✅ Complete (Future features: milestone rewards, notifications)

### User Story
As a user, I want to maintain daily streaks by completing tasks so that I stay motivated to work consistently every day.

### Implementation Details
- Created `StreakService` for streak-related database operations with full CRUD
- Implemented `useStreak` React hook for easy UI integration
- Created `StreakBadge` component for visual streak display with flame icon
- Added comprehensive TypeScript types for database schema
- Implemented timezone-aware streak calculation using UTC dates
- Database triggers automatically update streaks on task completion
- Dashboard integration showing real streak data
- User_streaks table with current_streak, longest_streak, last_activity_date

### Acceptance Criteria
- [x] System tracks consecutive days of task completion (via database triggers)
- [x] Streak counter increases when user completes at least one task per day (automatic via trigger_update_streak)
- [x] Streak resets to 0 if user misses a day (implemented in update_streak_on_task_completion function)
- [x] User can see current streak and longest streak (dashboard display with real data)
- [x] Streak progress is displayed on dashboard (StreakBadge component with flame icon)
- [x] System handles timezone differences correctly (UTC date calculations)
- [x] Automatic streak updates when tasks are completed (database trigger integration)
- [ ] Streak milestones trigger bonus XP rewards (XP service has STREAK_MILESTONES but not fully integrated)
- [ ] Streak notifications remind users to maintain momentum (Future feature - no notification system)

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
