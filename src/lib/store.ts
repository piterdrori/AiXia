import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  User, Project, Task, Comment, Notification, CalendarEvent, Conversation, Message, Activity,
  UserRole, TaskStatus
} from '@/types';
import { db } from '@/server/database';
import { wsClient, WebSocketClient } from '@/server/websocket';
import { getEffectivePermissions, hasPermission, loginUser, registerUser, approveUser, rejectUser, validateSession, logout } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
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
  createConversation: (participants: string[], type: 'DIRECT' | 'PROJECT' | 'TASK', name?: string) => Conversation;
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

export const useStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // Initial state
    currentUser: null,
    token: localStorage.getItem('taskflow_token'),
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
    currentView: 'dashboard',
    wsClient: wsClient,

    // Auth
    login: async (email, password) => {
      const result = loginUser(email, password);
      if (result.success && result.user && result.token) {
        localStorage.setItem('taskflow_token', result.token);
        set(state => {
          state.currentUser = result.user!;
          state.token = result.token!;
          state.isAuthenticated = true;
        });
        wsClient.connect(result.user!.id);
        get().refreshData();
        return { success: true };
      }
      return { success: false, error: result.error };
    },

    register: async (email, password, fullName, role) => {
      const result = registerUser(email, password, fullName, role);
      if (result.success && result.user) {
        // Broadcast to admins
        wsClient.emit('user:pendingCreated', result.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    },

    logout: () => {
      const token = get().token;
      if (token) {
        logout(token);
      }
      localStorage.removeItem('taskflow_token');
      wsClient.disconnect();
      set(state => {
        state.currentUser = null;
        state.token = null;
        state.isAuthenticated = false;
      });
    },

    restoreSession: async () => {
      const token = localStorage.getItem('taskflow_token');
      if (!token) {
        set(state => { state.isLoading = false; });
        return false;
      }
      
      const user = validateSession(token);
      if (user) {
        set(state => {
          state.currentUser = user;
          state.token = token;
          state.isAuthenticated = true;
          state.isLoading = false;
        });
        wsClient.connect(user.id);
        get().refreshData();
        return true;
      }
      
      localStorage.removeItem('taskflow_token');
      set(state => { state.isLoading = false; });
      return false;
    },

    // Users
    approveUser: (userId) => {
      const user = approveUser(userId);
      if (user) {
        wsClient.emit('user:approved', user);
        get().refreshData();
      }
    },

    rejectUser: (userId) => {
      rejectUser(userId);
      wsClient.emit('user:rejected', { userId });
      get().refreshData();
    },

    updateUserPermissions: (userId, permissions) => {
  // Clone permissions to avoid passing frozen/shared references
  const safePermissions = structuredClone
    ? structuredClone(permissions)
    : JSON.parse(JSON.stringify(permissions));

  db.updateUser(userId, { permissions: safePermissions });
  get().refreshData();
},

    updateUser: (userId, data) => {
      db.updateUser(userId, data);
      get().refreshData();
    },

    getUserById: (userId) => {
      return db.getUserById(userId);
    },

    // Projects
    createProject: (data) => {
      const now = new Date().toISOString();
      const project: Project = {
        id: uuidv4(),
        name: data.name || 'Untitled Project',
        description: data.description || '',
        status: data.status || 'PLANNING',
        health: 'GOOD',
        progress: 0,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: get().currentUser!.id,
        createdAt: now,
        updatedAt: now,
        members: [{
          userId: get().currentUser!.id,
          role: 'OWNER',
          joinedAt: now,
        }],
        ...data,
      };
      
      db.createProject(project);
      wsClient.emit('project:create', project);
      
      // Create activity
      const activity: Activity = {
        id: uuidv4(),
        type: 'PROJECT_CREATED',
        userId: get().currentUser!.id,
        projectId: project.id,
        metadata: { projectName: project.name },
        createdAt: now,
      };
      db.createActivity(activity);
      wsClient.emit('activity:created', activity);
      
      get().refreshData();
      return project;
    },

    updateProject: (id, data) => {
      db.updateProject(id, data);
      const project = db.getProjectById(id);
      if (project) {
        wsClient.emit('project:update', project);
      }
      get().refreshData();
    },

    deleteProject: (id) => {
      db.deleteProject(id);
      wsClient.emit('project:delete', { projectId: id });
      get().refreshData();
    },

    getProjectById: (id) => {
      return db.getProjectById(id);
    },

    getProjectsByUser: (userId) => {
      return db.getProjects().filter(p => 
        p.members.some(m => m.userId === userId) || p.createdBy === userId
      );
    },

    // Tasks
    createTask: (data) => {
      const now = new Date().toISOString();
      const task: Task = {
        id: uuidv4(),
        title: data.title || 'Untitled Task',
        description: data.description || '',
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        projectId: data.projectId || '',
        assignees: data.assignees || [],
        createdBy: get().currentUser!.id,
        dueDate: data.dueDate,
        progress: 0,
        checklist: [],
        tags: [],
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      
      db.createTask(task);
      wsClient.emit('task:create', task);
      
      // Create notifications for assignees
      task.assignees.forEach(assigneeId => {
        if (assigneeId !== get().currentUser!.id) {
          const notification: Notification = {
            id: uuidv4(),
            userId: assigneeId,
            type: 'TASK_ASSIGNED',
            title: 'New Task Assigned',
            message: `You have been assigned to "${task.title}"`,
            read: false,
            metadata: { taskId: task.id, projectId: task.projectId },
            createdAt: now,
          };
          db.createNotification(notification);
          wsClient.emit('notification:created', notification);
        }
      });
      
      // Create activity
      const activity: Activity = {
        id: uuidv4(),
        type: 'TASK_CREATED',
        userId: get().currentUser!.id,
        projectId: task.projectId,
        taskId: task.id,
        metadata: { taskTitle: task.title },
        createdAt: now,
      };
      db.createActivity(activity);
      wsClient.emit('activity:created', activity);
      
      get().refreshData();
      return task;
    },

    updateTask: (id, data) => {
      const oldTask = db.getTaskById(id);
      db.updateTask(id, data);
      const task = db.getTaskById(id);
      
      if (task) {
        wsClient.emit('task:update', task);
        
        // Check for status change
        if (oldTask && oldTask.status !== task.status) {
          wsClient.emit('task:statusChanged', { taskId: id, oldStatus: oldTask.status, newStatus: task.status });
        }
      }
      
      get().refreshData();
    },

    deleteTask: (id) => {
      db.deleteTask(id);
      wsClient.emit('task:delete', { taskId: id });
      get().refreshData();
    },

    getTaskById: (id) => {
      return db.getTaskById(id);
    },

    getTasksByProject: (projectId) => {
      return db.getTasksByProject(projectId);
    },

    getTasksByAssignee: (userId) => {
      return db.getTasksByAssignee(userId);
    },

    moveTask: (taskId, newStatus) => {
      const task = db.getTaskById(taskId);
      if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        db.updateTask(taskId, { status: newStatus });
        wsClient.emit('task:statusChanged', { taskId, oldStatus, newStatus });
        
        // Create activity
        const activity: Activity = {
          id: uuidv4(),
          type: 'TASK_STATUS_CHANGED',
          userId: get().currentUser!.id,
          projectId: task.projectId,
          taskId: task.id,
          metadata: { taskTitle: task.title, oldStatus, newStatus },
          createdAt: new Date().toISOString(),
        };
        db.createActivity(activity);
        wsClient.emit('activity:created', activity);
        
        get().refreshData();
      }
    },

    // Comments
    createComment: (taskId, content) => {
      const now = new Date().toISOString();
      const comment: Comment = {
        id: uuidv4(),
        taskId,
        userId: get().currentUser!.id,
        content,
        createdAt: now,
      };
      
      db.createComment(comment);
      wsClient.emit('comment:create', comment);
      
      // Create activity
      const task = db.getTaskById(taskId);
      if (task) {
        const activity: Activity = {
          id: uuidv4(),
          type: 'COMMENT_ADDED',
          userId: get().currentUser!.id,
          projectId: task.projectId,
          taskId,
          metadata: { taskTitle: task.title },
          createdAt: now,
        };
        db.createActivity(activity);
        wsClient.emit('activity:created', activity);
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

    getCommentsByTask: (taskId) => {
      return db.getCommentsByTask(taskId);
    },

    // Notifications
    markNotificationAsRead: (id) => {
      db.updateNotification(id, { read: true });
      get().refreshData();
    },

    markAllNotificationsAsRead: () => {
      const userId = get().currentUser?.id;
      if (userId) {
        db.markAllNotificationsAsRead(userId);
        get().refreshData();
      }
    },

    deleteNotification: (id) => {
      db.deleteNotification(id);
      get().refreshData();
    },

    getUnreadNotificationCount: () => {
      const userId = get().currentUser?.id;
      return userId ? db.getUnreadNotificationCount(userId) : 0;
    },

    // Calendar
    createCalendarEvent: (data) => {
      const now = new Date().toISOString();
      const event: CalendarEvent = {
        id: uuidv4(),
        title: data.title || 'Untitled Event',
        description: data.description,
        startDate: data.startDate || now,
        endDate: data.endDate || now,
        allDay: data.allDay || false,
        projectId: data.projectId,
        taskId: data.taskId,
        createdBy: get().currentUser!.id,
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      
      db.createCalendarEvent(event);
      wsClient.emit('calendar:eventCreate', event);
      get().refreshData();
      return event;
    },

    updateCalendarEvent: (id, data) => {
      db.updateCalendarEvent(id, data);
      const event = db.getCalendarEventById(id);
      if (event) {
        wsClient.emit('calendar:eventUpdate', event);
      }
      get().refreshData();
    },

    deleteCalendarEvent: (id) => {
      db.deleteCalendarEvent(id);
      wsClient.emit('calendar:eventDelete', { eventId: id });
      get().refreshData();
    },

    // Chat
    createConversation: (participants, type, name) => {
      const now = new Date().toISOString();
      const conversation: Conversation = {
        id: uuidv4(),
        type,
        name,
        participants,
        createdAt: now,
      };
      
      db.createConversation(conversation);
      get().refreshData();
      return conversation;
    },

    sendMessage: (conversationId, content) => {
      const now = new Date().toISOString();
      const message: Message = {
        id: uuidv4(),
        conversationId,
        userId: get().currentUser!.id,
        content,
        type: 'TEXT',
        createdAt: now,
      };
      
      db.createMessage(message);
      wsClient.emit('message:send', message);
      get().refreshData();
      return message;
    },

    getMessages: (conversationId) => {
      return db.getMessagesByConversation(conversationId);
    },

    // Activities
    getActivities: (limit = 50) => {
      return db.getActivities(limit);
    },

    getActivitiesByProject: (projectId) => {
      return db.getActivitiesByProject(projectId);
    },

    // UI
    toggleSidebar: () => {
      set(state => {
        state.sidebarOpen = !state.sidebarOpen;
      });
    },

    setCurrentView: (view) => {
      set(state => {
        state.currentView = view;
      });
    },

    // Permissions
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

    // Refresh data
refreshData: () => {
  const user = get().currentUser;
  if (!user) return;

  const clone = <T,>(data: T): T => {
    // structuredClone exists in modern browsers
    // fallback works for plain JSON data
    // @ts-ignore
    return typeof structuredClone === 'function'
      // @ts-ignore
      ? structuredClone(data)
      : JSON.parse(JSON.stringify(data));
  };

  // IMPORTANT: clone DB data so Immer doesn't freeze DB's internal references
  const users = clone(db.getUsers());
  const projects = clone(db.getProjects());
  const tasks = clone(db.getTasks());
  const notifications = clone(db.getNotificationsByUser(user.id));
  const calendarEvents = clone(db.getCalendarEvents());
  const conversations = clone(db.getConversationsByUser(user.id));
  const activities = clone(db.getActivities());

  set(state => {
    state.users = users;
    state.projects = projects;
    state.tasks = tasks;
    state.notifications = notifications;
    state.calendarEvents = calendarEvents;
    state.conversations = conversations;
    state.activities = activities;

    // Load messages for each conversation (also clone)
    state.conversations.forEach(conv => {
      state.messages[conv.id] = clone(db.getMessagesByConversation(conv.id));
    });
  });
},
}));
