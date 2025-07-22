import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  level: integer("level").default(1),
  totalXP: integer("total_xp").default(0),
  currentStreak: integer("current_streak").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Goals table
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("active"), // active, completed, paused
  targetXP: integer("target_xp").default(0),
  earnedXP: integer("earned_xp").default(0),
  priority: varchar("priority").default("medium"), // low, medium, high
  startDate: date("start_date"),
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").references(() => goals.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("active"), // active, completed, paused
  priority: varchar("priority").default("medium"), // low, medium, high
  targetDate: date("target_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  company: text("company"),
  position: text("position"),
  priority: varchar("priority").default("medium"), // low, medium, high
  tags: text("tags").array(),
  notes: text("notes"),
  lastContactDate: date("last_contact_date"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").references(() => goals.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("pending"), // pending, completed, cancelled
  priority: varchar("priority").default("medium"), // low, medium, high
  complexity: varchar("complexity").default("simple"), // simple, medium, complex
  xpReward: integer("xp_reward").notNull().default(25),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table for CRM backlog
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // whatsapp, email, phone, meeting, social
  content: text("content"),
  direction: varchar("direction").notNull(), // incoming, outgoing
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily goals table
export const dailyGoals = pgTable("daily_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  targetXP: integer("target_xp").notNull().default(500),
  earnedXP: integer("earned_xp").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Achievements table
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // streak, tasks, xp, contacts, etc.
  name: text("name").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  xpReward: integer("xp_reward").default(0),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  goals: many(goals),
  projects: many(projects),
  tasks: many(tasks),
  contacts: many(contacts),
  conversations: many(conversations),
  dailyGoals: many(dailyGoals),
  achievements: many(achievements),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  projects: many(projects),
  tasks: many(tasks),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [projects.goalId],
    references: [goals.id],
  }),
  tasks: many(tasks),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  conversations: many(conversations),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [tasks.goalId],
    references: [goals.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  contact: one(contacts, {
    fields: [tasks.contactId],
    references: [contacts.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
}));

export const dailyGoalsRelations = relations(dailyGoals, ({ one }) => ({
  user: one(users, {
    fields: [dailyGoals.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  userId: true,
  earnedXP: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  userId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertDailyGoalSchema = createInsertSchema(dailyGoals).omit({
  id: true,
  userId: true,
  earnedXP: true,
  tasksCompleted: true,
  isCompleted: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type DailyGoal = typeof dailyGoals.$inferSelect;
export type InsertDailyGoal = z.infer<typeof insertDailyGoalSchema>;
export type Achievement = typeof achievements.$inferSelect;
