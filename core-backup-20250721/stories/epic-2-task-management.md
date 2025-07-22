# Epic 2: Gamified Task Management System - User Stories

**Epic:** Gamified Task Management System  
**Priority:** P0 (Must Have)  
**Scrum Master:** Bob  
**Total Story Points:** 42

---

## Story 2.1: Goal Creation and Management
**Story Points:** 8  
**Priority:** High

### User Story
As a user, I want to create and manage goals so that I can organize my high-level objectives and track my progress toward achieving them.

### Acceptance Criteria
- [ ] User can create a new goal with title and description
- [ ] User can set a target date for goal completion
- [ ] User can edit existing goal details
- [ ] User can view all their goals in a list/grid view
- [ ] User can mark goals as active, completed, or paused
- [ ] User can delete goals (with confirmation dialog)
- [ ] Goals display total XP earned from associated projects/tasks
- [ ] User can see progress percentage based on completed tasks

### Technical Notes
- Create goals table with user_id foreign key
- Implement CRUD operations for goals
- Calculate XP totals from associated projects/tasks
- Use RLS policies to ensure users only see their own goals

---

## Story 2.2: Project Creation Under Goals
**Story Points:** 6  
**Priority:** High

### User Story
As a user, I want to create projects under my goals so that I can break down large objectives into manageable work streams.

### Acceptance Criteria
- [ ] User can create projects within a specific goal
- [ ] Projects have title, description, and status fields
- [ ] User can view all projects within a goal
- [ ] User can edit project details
- [ ] User can move projects between goals
- [ ] User can mark projects as active, completed, or paused
- [ ] Projects show task count and completion percentage
- [ ] User can delete projects (with confirmation)

### Technical Notes
- Create projects table with goal_id and user_id foreign keys
- Implement hierarchical relationship: Goals → Projects
- Calculate project completion based on task status
- Ensure data consistency when moving projects between goals

---

## Story 2.3: Task Creation with Complexity Levels
**Story Points:** 8  
**Priority:** High

### User Story
As a user, I want to create tasks with different complexity levels so that I can earn appropriate XP rewards based on the effort required.

### Acceptance Criteria
- [ ] User can create tasks within projects
- [ ] Tasks have title, description, due date, and priority fields
- [ ] User can select complexity level: Simple (25 XP), Medium (50 XP), Complex (100 XP)
- [ ] Tasks display expected XP reward before completion
- [ ] User can edit task details including complexity
- [ ] User can set task priority: Low, Medium, High
- [ ] Tasks can be linked to contacts from CRM
- [ ] User can add notes and attachments to tasks

### Technical Notes
- Create tasks table with project_id, user_id, and contact_id foreign keys
- Implement XP calculation based on complexity enum
- Store XP values as constants that can be configured
- Validate complexity and priority enum values

---

## Story 2.4: Task Completion and XP Rewards
**Story Points:** 8  
**Priority:** High

### User Story
As a user, I want to complete tasks and earn XP so that I feel rewarded for my progress and can see my advancement in the gamification system.

### Acceptance Criteria
- [ ] User can mark tasks as completed with a single click/tap
- [ ] Completed tasks immediately award XP based on complexity
- [ ] XP is added to user's total XP in their profile
- [ ] User sees XP gain notification when completing tasks
- [ ] Completed tasks show completion timestamp
- [ ] User can undo task completion within 5 minutes
- [ ] XP calculations are accurate and consistent
- [ ] Bulk task completion is supported

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

### User Story
As a user, I want to maintain daily streaks by completing tasks so that I stay motivated to work consistently every day.

### Acceptance Criteria
- [ ] System tracks consecutive days of task completion
- [ ] Streak counter increases when user completes at least one task per day
- [ ] Streak resets to 0 if user misses a day
- [ ] User can see current streak and longest streak
- [ ] Streak milestones trigger bonus XP rewards
- [ ] Streak progress is displayed on dashboard
- [ ] System handles timezone differences correctly
- [ ] Streak notifications remind users to maintain momentum

### Technical Notes
- Track last_activity_date in user profile
- Calculate streaks based on task completion dates
- Handle timezone conversion for accurate daily tracking
- Implement streak bonus XP calculations
- Use scheduled functions to check and update streaks daily
- Store streak history for analytics and achievements

---

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] XP calculations verified and tested
- [ ] Real-time updates working correctly
- [ ] Mobile responsiveness verified
- [ ] Performance tested with large datasets
