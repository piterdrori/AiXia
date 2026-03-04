import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  User,
  Project,
  Task,
  Comment,
  Notification,
  CalendarEvent,
  Conversation,
  Message,
  Activity,
  UserRole,
  TaskStatus,
} from "@/types";

import { db } from "@/server/database";
import { wsClient, WebSocketClient } from "@/server/websocket";
import {
  getEffectivePermissions,
  hasPermission,
  loginUser,
  registerUser,
  approveUser,
  rejectUser,
  validateSession,
  logout,
} from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

interface AppState {
  // Auth
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Data
  users: User[];
  projects: Project[];
  tasks: Task[];
  notifications: Notification[];
  calendarEvents: CalendarEvent[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activities: Activity[];

  // UI State
  sidebarOpen: boolean;
  currentView: string;

  // WebSocket
  wsClient: WebSocketClient;
}

interface AppActions {
  // Auth
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  restoreSession: () => Promise<boolean>;

  // Users
  approveUser: (userId: string) => void;
  rejectUser: (userId: string) => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  updateUserPermissions: (userId: string, permissions: any) => void;
  getUserById: (userId: string) => User | undefined;

  // Projects
  createProject: (data: Partial<Project>) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
  getProjectsByUser: (userId: string) => Project[];

  // Tasks
  createTask: (data: Partial<Task>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTaskById: (id: string) => Task | undefined;
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (userId: string) => Task[];
  moveTask: (taskId: string, newStatus: TaskStatus) => void;

  // Comments
  createComment: (taskId: string, content: string) => Comment;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;
  getCommentsByTask: (taskId: string) => Comment[];

  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  getUnreadNotificationCount: () => number;

  // Calendar
  createCalendarEvent: (data: Partial<CalendarEvent>) => CalendarEvent;
  updateCalendarEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  // Chat
  createConversation: (
    participants: string[],
    type: "DIRECT" | "PROJECT" | "TASK",
    name?: string
  ) => Conversation;
  sendMessage: (conversationId: string, content: string) => Message;
  getMessages: (conversationId: string) => Message[];

  // Activities
  getActivities: (limit?: number) => Activity[];
  getActivitiesByProject: (projectId: string) => Activity[];

  // UI
  toggleSidebar: () => void;
  setCurrentView: (view: string) => void;

  // Permissions
  hasPermission: (permission: string, context?: any) => boolean;
  getEffectivePermissions: () => any;

  // Refresh data
  refreshData: () => void;
}

/** Deep clone helper:
 * - avoids passing Immer-frozen references into db (which may mutate)
 * - avoids putting db internal references into Immer state (which will freeze them)
 */
function deepClone<T>(value: T): T {
  try {
    // modern browsers / runtimes
    if (typeof globalThis.structuredClone === "function") {
      return globalThis.structuredClone(value);
    }
  } catch {
    // ignore and fallback
  }
  return JSON.parse(JSON.stringify(value));
}

export const useStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // Initial state
    currentUser: null,
    token: localStorage.getItem("taskflow_token"),
    isAuthenticated: false,
    isLoading: true,

    users: [],
    projects: [],
    tasks: [],
    notifications: [],
    calendarEvents: [],
    conversations: [],
    messages: {},
    activities: [],

    sidebarOpen: true,
    currentView: "dashboard",
    wsClient,

    // --------------------------
    // Auth
    // --------------------------
    login: async (email, password) => {
      const result = loginUser(email, password);
      if (result.success && result.user && result.token) {
        localStorage.setItem("taskflow_token", result.token);
        set((state) => {
          state.currentUser = result.user!;
          state.token = result.token!;
          state.isAuthenticated = true;
          state.isLoading = false;
        });

        wsClient.connect(result.user.id);
        get().refreshData();
        return { success: true };
      }
      set((state) => {
        state.isLoading = false;
      });
      return { success: false, error: result.error };
    },

    register: async (email, password, fullName, role) => {
      const result = registerUser(email, password, fullName, role);
      if (result.success && result.user) {
        wsClient.emit("user:pendingCreated", result.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    },

    logout: () => {
      const token = get().token;
      if (token) logout(token);

      localStorage.removeItem("taskflow_token");
      wsClient.disconnect();

      set((state) => {
        state.currentUser = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.users = [];
        state.projects = [];
        state.tasks = [];
        state.notifications = [];
        state.calendarEvents = [];
        state.conversations = [];
        state.messages = {};
        state.activities = [];
      });
    },

    restoreSession: async () => {
      const token = localStorage.getItem("taskflow_token");
      if (!token) {
        set((state) => {
          state.isLoading = false;
        });
        return false;
      }

      const user = validateSession(token);
      if (user) {
        set((state) => {
          state.currentUser = user;
          state.token = token;
          state.isAuthenticated = true;
          state.isLoading = false;
        });

        wsClient.connect(user.id);
        get().refreshData();
        return true;
      }

      localStorage.removeItem("taskflow_token");
      set((state) => {
        state.isLoading = false;
      });
      return false;
    },

    // --------------------------
    // Users
    // --------------------------
    approveUser: (userId) => {
      const user = approveUser(userId);
      if (user) {
        wsClient.emit("user:approved", user);
        get().refreshData();
      }
    },

    rejectUser: (userId) => {
      rejectUser(userId);
      wsClient.emit("user:rejected", { userId });
      get().refreshData();
    },

    updateUser: (userId, data) => {
      db.updateUser(userId, deepClone(data));
      get().refreshData();
    },

    updateUserPermissions: (userId, permissions) => {
      // CRITICAL: clone before giving to db to avoid Immer-frozen objects/arrays
      const safePermissions = deepClone(permissions);
      db.updateUser(userId, { permissions: safePermissions });
      get().refreshData();
    },

    getUserById: (userId) => db.getUserById(userId),

    // --------------------------
    // Projects
    // --------------------------
    createProject: (data) => {
      const now = new Date().toISOString();
      const currentUser = get().currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const project: Project = {
        id: uuidv4(),
        name: data.name || "Untitled Project",
        description: data.description || "",
        status: data.status || "PLANNING",
        health: "GOOD",
        progress: 0,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
        members: [
          {
            userId: currentUser.id,
            role: "OWNER",
            joinedAt: now,
          },
        ],
        ...data,
      };

      db.createProject(deepClone(project));
      wsClient.emit("project:create", project);

      const activity: Activity = {
        id: uuidv4(),
        type: "PROJECT_CREATED",
        userId: currentUser.id,
        projectId: project.id,
        metadata: { projectName: project.name },
        createdAt: now,
      };
      db.createActivity(deepClone(activity));
      wsClient.emit("activity:created", activity);

      get().refreshData();
      return project;
    },

    updateProject: (id, data) => {
      db.updateProject(id, deepClone(data));
      const project = db.getProjectById(id);
      if (project) wsClient.emit("project:update", project);
      get().refreshData();
    },

    deleteProject: (id) => {
      db.deleteProject(id);
      wsClient.emit("project:delete", { projectId: id });
      get().refreshData();
    },

    getProjectById: (id) => db.getProjectById(id),

    getProjectsByUser: (userId) =>
      db
        .getProjects()
        .filter(
          (p) => p.members.some((m) => m.userId === userId) || p.createdBy === userId
        ),

    // --------------------------
    // Tasks
    // --------------------------
    createTask: (data) => {
      const now = new Date().toISOString();
      const currentUser = get().currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const task: Task = {
        id: uuidv4(),
        title: data.title || "Untitled Task",
        description: data.description || "",
        status: data.status || "TODO",
        priority: data.priority || "MEDIUM",
        projectId: data.projectId || "",
        assignees: data.assignees || [],
        createdBy: currentUser.id,
        dueDate: data.dueDate,
        progress: 0,
        checklist: [],
        tags: [],
        createdAt: now,
        updatedAt: now,
        ...data,
      };

      db.createTask(deepClone(task));
      wsClient.emit("task:create", task);

      // notifications for assignees
      task.assignees.forEach((assigneeId) => {
        if (assigneeId !== currentUser.id) {
          const notification: Notification = {
            id: uuidv4(),
            userId: assigneeId,
            type: "TASK_ASSIGNED",
            title: "New Task Assigned",
            message: `You have been assigned to "${task.title}"`,
            read: false,
            metadata: { taskId: task.id, projectId: task.projectId },
            createdAt: now,
          };
          db.createNotification(deepClone(notification));
          wsClient.emit("notification:created", notification);
        }
      });

      const activity: Activity = {
        id: uuidv4(),
        type: "TASK_CREATED",
        userId: currentUser.id,
        projectId: task.projectId,
        taskId: task.id,
        metadata: { taskTitle: task.title },
        createdAt: now,
      };
      db.createActivity(deepClone(activity));
      wsClient.emit("activity:created", activity);

      get().refreshData();
      return task;
    },

    updateTask: (id, data) => {
      const oldTask = db.getTaskById(id);
      db.updateTask(id, deepClone(data));
      const task = db.getTaskById(id);

      if (task) {
        wsClient.emit("task:update", task);
        if (oldTask && oldTask.status !== task.status) {
          wsClient.emit("task:statusChanged", {
            taskId: id,
            oldStatus: oldTask.status,
            newStatus: task.status,
          });
        }
      }

      get().refreshData();
    },

    deleteTask: (id) => {
      db.deleteTask(id);
      wsClient.emit("task:delete", { taskId: id });
      get().refreshData();
    },

    getTaskById: (id) => db.getTaskById(id),

    getTasksByProject: (projectId) => db.getTasksByProject(projectId),

    getTasksByAssignee: (userId) => db.getTasksByAssignee(userId),

    moveTask: (taskId, newStatus) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;

      const task = db.getTaskById(taskId);
      if (!task || task.status === newStatus) return;

      const oldStatus = task.status;
      db.updateTask(taskId, { status: newStatus });
      wsClient.emit("task:statusChanged", { taskId, oldStatus, newStatus });

      const activity: Activity = {
        id: uuidv4(),
        type: "TASK_STATUS_CHANGED",
        userId: currentUser.id,
        projectId: task.projectId,
        taskId: task.id,
        metadata: { taskTitle: task.title, oldStatus, newStatus },
        createdAt: new Date().toISOString(),
      };
      db.createActivity(deepClone(activity));
      wsClient.emit("activity:created", activity);

      get().refreshData();
    },

    // --------------------------
    // Comments
    // --------------------------
    createComment: (taskId, content) => {
      const now = new Date().toISOString();
      const currentUser = get().currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const comment: Comment = {
        id: uuidv4(),
        taskId,
        userId: currentUser.id,
        content,
        createdAt: now,
      };

      db.createComment(deepClone(comment));
      wsClient.emit("comment:create", comment);

      const task = db.getTaskById(taskId);
      if (task) {
        const activity: Activity = {
          id: uuidv4(),
          type: "COMMENT_ADDED",
          userId: currentUser.id,
          projectId: task.projectId,
          taskId,
          metadata: { taskTitle: task.title },
          createdAt: now,
        };
        db.createActivity(deepClone(activity));
        wsClient.emit("activity:created", activity);
      }

      get().refreshData();
      return comment;
    },

    updateComment: (id, content) => {
      db.updateComment(id, { content });
      get().refreshData();
    },

    deleteComment: (id) => {
      db.deleteComment(id);
      get().refreshData();
    },

    getCommentsByTask: (taskId) => db.getCommentsByTask(taskId),

    // --------------------------
    // Notifications
    // --------------------------
    markNotificationAsRead: (id) => {
      db.updateNotification(id, { read: true });
      get().refreshData();
    },

    markAllNotificationsAsRead: () => {
      const userId = get().currentUser?.id;
      if (!userId) return;
      db.markAllNotificationsAsRead(userId);
      get().refreshData();
    },

    deleteNotification: (id) => {
      db.deleteNotification(id);
      get().refreshData();
    },

    getUnreadNotificationCount: () => {
      const userId = get().currentUser?.id;
      return userId ? db.getUnreadNotificationCount(userId) : 0;
    },

    // --------------------------
    // Calendar
    // --------------------------
    createCalendarEvent: (data) => {
      const now = new Date().toISOString();
      const currentUser = get().currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const event: CalendarEvent = {
        id: uuidv4(),
        title: data.title || "Untitled Event",
        description: data.description,
        startDate: data.startDate || now,
        endDate: data.endDate || now,
        allDay: data.allDay || false,
        projectId: data.projectId,
        taskId: data.taskId,
        createdBy: currentUser.id,
        createdAt: now,
        updatedAt: now,
        ...data,
      };

      db.createCalendarEvent(deepClone(event));
      wsClient.emit("calendar:eventCreate", event);
      get().refreshData();
      return event;
    },

    updateCalendarEvent: (id, data) => {
      db.updateCalendarEvent(id, deepClone(data));
      const event = db.getCalendarEventById(id);
      if (event) wsClient.emit("calendar:eventUpdate", event);
      get().refreshData();
    },

    deleteCalendarEvent: (id) => {
      db.deleteCalendarEvent(id);
      wsClient.emit("calendar:eventDelete", { eventId: id });
      get().refreshData();
    },

    // --------------------------
    // Chat
    // --------------------------
    createConversation: (participants, type, name) => {
      const now = new Date().toISOString();
      const conversation: Conversation = {
        id: uuidv4(),
        type,
        name,
        participants,
        createdAt: now,
      };
      db.createConversation(deepClone(conversation));
      get().refreshData();
      return conversation;
    },

    sendMessage: (conversationId, content) => {
      const now = new Date().toISOString();
      const currentUser = get().currentUser;
      if (!currentUser) throw new Error("Not authenticated");

      const message: Message = {
        id: uuidv4(),
        conversationId,
        userId: currentUser.id,
        content,
        type: "TEXT",
        createdAt: now,
      };

      db.createMessage(deepClone(message));
      wsClient.emit("message:send", message);
      get().refreshData();
      return message;
    },

    getMessages: (conversationId) => db.getMessagesByConversation(conversationId),

    // --------------------------
    // Activities
    // --------------------------
    getActivities: (limit = 50) => db.getActivities(limit),

    getActivitiesByProject: (projectId) => db.getActivitiesByProject(projectId),

    // --------------------------
    // UI
    // --------------------------
    toggleSidebar: () => {
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      });
    },

    setCurrentView: (view) => {
      set((state) => {
        state.currentView = view;
      });
    },

    // --------------------------
    // Permissions
    // --------------------------
    hasPermission: (permission, context) => {
      const user = get().currentUser;
      if (!user) return false;
      return hasPermission(user, permission as any, context);
    },

    getEffectivePermissions: () => {
      const user = get().currentUser;
      if (!user) return {};
      return getEffectivePermissions(user);
    },

    // --------------------------
    // Refresh data (CRITICAL)
    // --------------------------
    refreshData: () => {
      const user = get().currentUser;
      if (!user) return;

      // clone DB data so Immer doesn't freeze DB internal references
      const users = deepClone(db.getUsers());
      const projects = deepClone(db.getProjects());
      const tasks = deepClone(db.getTasks());
      const notifications = deepClone(db.getNotificationsByUser(user.id));
      const calendarEvents = deepClone(db.getCalendarEvents());
      const conversations = deepClone(db.getConversationsByUser(user.id));
      const activities = deepClone(db.getActivities());

      set((state) => {
        state.users = users;
        state.projects = projects;
        state.tasks = tasks;
        state.notifications = notifications;
        state.calendarEvents = calendarEvents;
        state.conversations = conversations;
        state.activities = activities;

        // Load messages per conversation
        const nextMessages: Record<string, Message[]> = {};
        conversations.forEach((conv) => {
          nextMessages[conv.id] = deepClone(db.getMessagesByConversation(conv.id));
        });
        state.messages = nextMessages;
      });
    },
  }))
);
