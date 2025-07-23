import { apiRequest } from "@/lib/queryClient";
import { InsertProject, Project } from "@shared/schema";

export interface ProjectWithStats extends Project {
  taskCount: number;
  completedTaskCount: number;
  completionPercentage: number;
}

export const createProject = async (data: Omit<InsertProject, 'userId'>) => {
  return await apiRequest<Project>("POST", "/api/projects", data);
};

export const getProjectsByGoal = async (goalId: number) => {
  return await apiRequest<ProjectWithStats[]>("GET", `/api/projects?goalId=${goalId}`);
};

export const getProjectById = async (id: number) => {
  return await apiRequest<ProjectWithStats>("GET", `/api/projects/${id}`);
};

export const updateProject = async (id: number, data: Partial<InsertProject>) => {
  return await apiRequest<Project>("PATCH", `/api/projects/${id}`, data);
};

export const deleteProject = async (id: number) => {
  return await apiRequest<{ success: boolean }>("DELETE", `/api/projects/${id}");
};

export const moveProject = async (projectId: number, newGoalId: number | null) => {
  return await apiRequest<Project>("PATCH", `/api/projects/${projectId}/move`, { goalId: newGoalId });
};

export const updateProjectStatus = async (id: number, status: 'active' | 'completed' | 'paused') => {
  return await apiRequest<Project>("PATCH", `/api/projects/${id}/status`, { status });
};
