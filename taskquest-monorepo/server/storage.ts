import {
  users,
  goals,
  projects,
  tasks,
  contacts,
  conversations,
  dailyGoals,
  achievements,
  type User,
  type UpsertUser,
  type Goal,
  type InsertGoal,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type Contact,
  type InsertContact,
  type Conversation,
  type InsertConversation,
  type DailyGoal,
  type InsertDailyGoal,
  type Achievement,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Goal operations
  getGoals(userId: string): Promise<Goal[]>;
  getGoal(id: number, userId: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal, userId: string): Promise<Goal>;
  updateGoal(id: number, goal: Partial<Goal>, userId: string): Promise<Goal | undefined>;
  deleteGoal(id: number, userId: string): Promise<boolean>;

  // Project operations
  getProjects(userId: string, goalId?: number): Promise<Project[]>;
  getProject(id: number, userId: string): Promise<Project | undefined>;
  createProject(project: InsertProject, userId: string): Promise<Project>;
  updateProject(id: number, project: Partial<Project>, userId: string): Promise<Project | undefined>;
  deleteProject(id: number, userId: string): Promise<boolean>;

  // Task operations
  getTasks(userId: string, filters?: { goalId?: number; projectId?: number; contactId?: number; status?: string }): Promise<Task[]>;
  getTask(id: number, userId: string): Promise<Task | undefined>;
  createTask(task: InsertTask, userId: string): Promise<Task>;
  updateTask(id: number, task: Partial<Task>, userId: string): Promise<Task | undefined>;
  deleteTask(id: number, userId: string): Promise<boolean>;
  completeTask(id: number, userId: string): Promise<{ task: Task; xpGained: number } | undefined>;

  // Contact operations
  getContacts(userId: string): Promise<Contact[]>;
  getContact(id: number, userId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact, userId: string): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>, userId: string): Promise<Contact | undefined>;
  deleteContact(id: number, userId: string): Promise<boolean>;

  // Conversation operations
  getConversations(userId: string, contactId?: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation, userId: string): Promise<Conversation>;

  // Daily goal operations
  getDailyGoal(userId: string, date: string): Promise<DailyGoal | undefined>;
  createDailyGoal(dailyGoal: InsertDailyGoal, userId: string): Promise<DailyGoal>;
  updateDailyGoal(date: string, xpGained: number, userId: string): Promise<void>;

  // Achievement operations
  getAchievements(userId: string): Promise<Achievement[]>;
  createAchievement(userId: string, type: string, name: string, description: string, icon: string, xpReward: number): Promise<Achievement>;

  // Dashboard operations
  getDashboardData(userId: string): Promise<{
    user: User;
    dailyGoal: DailyGoal | null;
    activeGoals: Goal[];
    recentTasks: Task[];
    priorityContacts: Contact[];
    recentAchievements: Achievement[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Goal operations
  async getGoals(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async getGoal(id: number, userId: string): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    return goal;
  }

  async createGoal(goal: InsertGoal, userId: string): Promise<Goal> {
    const [newGoal] = await db
      .insert(goals)
      .values({ ...goal, userId })
      .returning();
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<Goal>, userId: string): Promise<Goal | undefined> {
    const [updatedGoal] = await db
      .update(goals)
      .set({ ...goal, updatedAt: new Date() })
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    return updatedGoal;
  }

  async deleteGoal(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    return result.rowCount > 0;
  }

  // Project operations
  async getProjects(userId: string, goalId?: number): Promise<Project[]> {
    const conditions = [eq(projects.userId, userId)];
    if (goalId) {
      conditions.push(eq(projects.goalId, goalId));
    }

    return await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number, userId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project;
  }

  async createProject(project: InsertProject, userId: string): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values({ ...project, userId })
      .returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<Project>, userId: string): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return result.rowCount > 0;
  }

  // Task operations
  async getTasks(userId: string, filters?: { goalId?: number; projectId?: number; contactId?: number; status?: string }): Promise<Task[]> {
    const conditions = [eq(tasks.userId, userId)];
    
    if (filters?.goalId) {
      conditions.push(eq(tasks.goalId, filters.goalId));
    }
    if (filters?.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }
    if (filters?.contactId) {
      conditions.push(eq(tasks.contactId, filters.contactId));
    }
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }

    return await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number, userId: string): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return task;
  }

  async createTask(task: InsertTask, userId: string): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values({ ...task, userId })
      .returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>, userId: string): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return result.rowCount > 0;
  }

  async completeTask(id: number, userId: string): Promise<{ task: Task; xpGained: number } | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ 
        status: 'completed', 
        completedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!task) return undefined;

    // Update user XP
    await db
      .update(users)
      .set({ 
        totalXP: sql`${users.totalXP} + ${task.xpReward}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Update daily goal
    const today = new Date().toISOString().split('T')[0];
    await this.updateDailyGoal(today, task.xpReward, userId);

    return { task, xpGained: task.xpReward };
  }

  // Contact operations
  async getContacts(userId: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.updatedAt));
  }

  async getContact(id: number, userId: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
    return contact;
  }

  async createContact(contact: InsertContact, userId: string): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values({ ...contact, userId })
      .returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<Contact>, userId: string): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set({ ...contact, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
    return result.rowCount > 0;
  }

  // Conversation operations
  async getConversations(userId: string, contactId?: number): Promise<Conversation[]> {
    const conditions = [eq(conversations.userId, userId)];
    if (contactId) {
      conditions.push(eq(conversations.contactId, contactId));
    }

    return await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.date));
  }

  async createConversation(conversation: InsertConversation, userId: string): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values({ ...conversation, userId })
      .returning();
    return newConversation;
  }

  // Daily goal operations
  async getDailyGoal(userId: string, date: string): Promise<DailyGoal | undefined> {
    const [dailyGoal] = await db
      .select()
      .from(dailyGoals)
      .where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, date)));
    return dailyGoal;
  }

  async createDailyGoal(dailyGoal: InsertDailyGoal, userId: string): Promise<DailyGoal> {
    const [newDailyGoal] = await db
      .insert(dailyGoals)
      .values({ ...dailyGoal, userId })
      .returning();
    return newDailyGoal;
  }

  async updateDailyGoal(date: string, xpGained: number, userId: string): Promise<void> {
    const existing = await this.getDailyGoal(userId, date);
    
    if (existing) {
      await db
        .update(dailyGoals)
        .set({ 
          earnedXP: sql`${dailyGoals.earnedXP} + ${xpGained}`,
          tasksCompleted: sql`${dailyGoals.tasksCompleted} + 1`
        })
        .where(and(eq(dailyGoals.userId, userId), eq(dailyGoals.date, date)));
    } else {
      await this.createDailyGoal({
        date,
        targetXP: 500,
        earnedXP: xpGained,
        tasksCompleted: 1
      }, userId);
    }
  }

  // Achievement operations
  async getAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.earnedAt));
  }

  async createAchievement(userId: string, type: string, name: string, description: string, icon: string, xpReward: number): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievements)
      .values({ userId, type, name, description, icon, xpReward })
      .returning();

    // Update user XP
    await db
      .update(users)
      .set({ 
        totalXP: sql`${users.totalXP} + ${xpReward}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return achievement;
  }

  // Dashboard operations
  async getDashboardData(userId: string): Promise<{
    user: User;
    dailyGoal: DailyGoal | null;
    activeGoals: Goal[];
    recentTasks: Task[];
    priorityContacts: Contact[];
    recentAchievements: Achievement[];
  }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const today = new Date().toISOString().split('T')[0];
    const dailyGoal = await this.getDailyGoal(userId, today);

    const activeGoals = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.status, 'active')))
      .orderBy(desc(goals.updatedAt))
      .limit(3);

    const recentTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.updatedAt))
      .limit(5);

    const priorityContacts = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.userId, userId), eq(contacts.priority, 'high')))
      .orderBy(asc(contacts.lastContactDate))
      .limit(3);

    const recentAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.earnedAt))
      .limit(3);

    return {
      user,
      dailyGoal,
      activeGoals,
      recentTasks,
      priorityContacts,
      recentAchievements,
    };
  }
}

export const storage = new DatabaseStorage();
