// TaskFlow Types

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'GUEST';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationType = 'TASK_ASSIGNED' | 'DUE_SOON' | 'OVERDUE' | 'PROJECT_INVITATION' | 'MENTION' | 'STATUS_CHANGE' | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  password: string;
  fullName: string;
  displayName?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  bio?: string;
  phone?: string;
  location?: string;
  permissions: PermissionOverrides;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface PermissionOverrides {
  createProjects?: boolean;
  editAllProjects?: boolean;
  deleteProjects?: boolean;
  createTasks?: boolean;
  editTasks?: boolean;
  deleteTasks?: boolean;
  manageUsers?: boolean;
  viewReports?: boolean;
  accessChat?: boolean;
  changeSettings?: boolean;
  visibility?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  health: 'GOOD' | 'AT_RISK' | 'CRITICAL';
  progress: number;
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
}

export interface ProjectMember {
  userId: string;
  role: 'OWNER' | 'MANAGER' | 'MEMBER';
  joinedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assignees: string[];
  createdBy: string;
  dueDate?: string;
  progress: number;
  checklist: ChecklistItem[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Activity {
  id: string;
  type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED' | 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'USER_JOINED' | 'COMMENT_ADDED';
  userId: string;
  projectId?: string;
  taskId?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  projectId?: string;
  taskId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'PROJECT' | 'TASK';
  name?: string;
  participants: string[];
  projectId?: string;
  taskId?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  type: 'TEXT' | 'SYSTEM' | 'FILE';
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  timestamp: number;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}

// Permission matrix type
export type PermissionMatrix = Record<string, Record<UserRole, boolean>>;
