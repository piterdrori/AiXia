import type { User, Project, Task, Comment, Activity, Notification, CalendarEvent, Conversation, Message, Session } from '@/types';

// In-memory database with file persistence
class Database {
  private data: {
    users: User[];
    projects: Project[];
    tasks: Task[];
    comments: Comment[];
    activities: Activity[];
    notifications: Notification[];
    calendarEvents: CalendarEvent[];
    conversations: Conversation[];
    messages: Message[];
    sessions: Session[];
  } = {
    users: [],
    projects: [],
    tasks: [],
    comments: [],
    activities: [],
    notifications: [],
    calendarEvents: [],
    conversations: [],
    messages: [],
    sessions: [],
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('taskflow_db');
      if (saved) {
        try {
          this.data = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load database:', e);
        }
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskflow_db', JSON.stringify(this.data));
    }
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.saveToStorage();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.data.users[index] = { ...this.data.users[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
      return this.data.users[index];
    }
    return undefined;
  }

  deleteUser(id: string): boolean {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.data.users.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  hasAdmin(): boolean {
    return this.data.users.some(u => u.role === 'ADMIN');
  }

  getPendingUsers(): User[] {
    return this.data.users.filter(u => u.status === 'PENDING');
  }

  // Projects
  getProjects(): Project[] {
    return this.data.projects;
  }

  getProjectById(id: string): Project | undefined {
    return this.data.projects.find(p => p.id === id);
  }

  createProject(project: Project): Project {
    this.data.projects.push(project);
    this.saveToStorage();
    return project;
  }

  updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.projects[index] = { ...this.data.projects[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
      return this.data.projects[index];
    }
    return undefined;
  }

  deleteProject(id: string): boolean {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      this.data.projects.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Tasks
  getTasks(): Task[] {
    return this.data.tasks;
  }

  getTaskById(id: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  getTasksByProject(projectId: string): Task[] {
    return this.data.tasks.filter(t => t.projectId === projectId);
  }

  getTasksByAssignee(userId: string): Task[] {
    return this.data.tasks.filter(t => t.assignees.includes(userId));
  }

  createTask(task: Task): Task {
    this.data.tasks.push(task);
    this.saveToStorage();
    return task;
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      this.data.tasks[index] = { ...this.data.tasks[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
      return this.data.tasks[index];
    }
    return undefined;
  }

  deleteTask(id: string): boolean {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      this.data.tasks.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Comments
  getCommentsByTask(taskId: string): Comment[] {
    return this.data.comments.filter(c => c.taskId === taskId).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  createComment(comment: Comment): Comment {
    this.data.comments.push(comment);
    this.saveToStorage();
    return comment;
  }

  updateComment(id: string, updates: Partial<Comment>): Comment | undefined {
    const index = this.data.comments.findIndex(c => c.id === id);
    if (index !== -1) {
      this.data.comments[index] = { ...this.data.comments[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
      return this.data.comments[index];
    }
    return undefined;
  }

  deleteComment(id: string): boolean {
    const index = this.data.comments.findIndex(c => c.id === id);
    if (index !== -1) {
      this.data.comments.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Activities
  getActivities(limit = 50): Activity[] {
    return this.data.activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getActivitiesByProject(projectId: string): Activity[] {
    return this.data.activities
      .filter(a => a.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getActivitiesByUser(userId: string): Activity[] {
    return this.data.activities
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createActivity(activity: Activity): Activity {
    this.data.activities.push(activity);
    this.saveToStorage();
    return activity;
  }

  // Notifications
  getNotificationsByUser(userId: string): Notification[] {
    return this.data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getUnreadNotificationCount(userId: string): number {
    return this.data.notifications.filter(n => n.userId === userId && !n.read).length;
  }

  createNotification(notification: Notification): Notification {
    this.data.notifications.push(notification);
    this.saveToStorage();
    return notification;
  }

  updateNotification(id: string, updates: Partial<Notification>): Notification | undefined {
    const index = this.data.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.data.notifications[index] = { ...this.data.notifications[index], ...updates };
      this.saveToStorage();
      return this.data.notifications[index];
    }
    return undefined;
  }

  markAllNotificationsAsRead(userId: string): void {
    this.data.notifications.forEach(n => {
      if (n.userId === userId) {
        n.read = true;
      }
    });
    this.saveToStorage();
  }

  deleteNotification(id: string): boolean {
    const index = this.data.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.data.notifications.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Calendar Events
  getCalendarEvents(): CalendarEvent[] {
    return this.data.calendarEvents;
  }

  getCalendarEventsByDateRange(start: string, end: string): CalendarEvent[] {
    return this.data.calendarEvents.filter(e => 
      e.startDate >= start && e.endDate <= end
    );
  }

  getCalendarEventById(id: string): CalendarEvent | undefined {
    return this.data.calendarEvents.find(e => e.id === id);
  }

  createCalendarEvent(event: CalendarEvent): CalendarEvent {
    this.data.calendarEvents.push(event);
    this.saveToStorage();
    return event;
  }

  updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | undefined {
    const index = this.data.calendarEvents.findIndex(e => e.id === id);
    if (index !== -1) {
      this.data.calendarEvents[index] = { ...this.data.calendarEvents[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
      return this.data.calendarEvents[index];
    }
    return undefined;
  }

  deleteCalendarEvent(id: string): boolean {
    const index = this.data.calendarEvents.findIndex(e => e.id === id);
    if (index !== -1) {
      this.data.calendarEvents.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Conversations
  getConversations(): Conversation[] {
    return this.data.conversations;
  }

  getConversationById(id: string): Conversation | undefined {
    return this.data.conversations.find(c => c.id === id);
  }

  getConversationsByUser(userId: string): Conversation[] {
    return this.data.conversations
      .filter(c => c.participants.includes(userId))
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  createConversation(conversation: Conversation): Conversation {
    this.data.conversations.push(conversation);
    this.saveToStorage();
    return conversation;
  }

  updateConversation(id: string, updates: Partial<Conversation>): Conversation | undefined {
    const index = this.data.conversations.findIndex(c => c.id === id);
    if (index !== -1) {
      this.data.conversations[index] = { ...this.data.conversations[index], ...updates };
      this.saveToStorage();
      return this.data.conversations[index];
    }
    return undefined;
  }

  // Messages
  getMessagesByConversation(conversationId: string): Message[] {
    return this.data.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  createMessage(message: Message): Message {
    this.data.messages.push(message);
    // Update conversation lastMessageAt
    const conv = this.getConversationById(message.conversationId);
    if (conv) {
      conv.lastMessageAt = message.createdAt;
      this.saveToStorage();
    }
    return message;
  }

  updateMessage(id: string, updates: Partial<Message>): Message | undefined {
    const index = this.data.messages.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.messages[index] = { ...this.data.messages[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
      return this.data.messages[index];
    }
    return undefined;
  }

  deleteMessage(id: string): boolean {
    const index = this.data.messages.findIndex(m => m.id === id);
    if (index !== -1) {
      this.data.messages.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Sessions
  createSession(session: Session): Session {
    this.data.sessions.push(session);
    this.saveToStorage();
    return session;
  }

  getSessionByToken(token: string): Session | undefined {
    return this.data.sessions.find(s => s.token === token && s.expiresAt > Date.now());
  }

  deleteSession(token: string): boolean {
    const index = this.data.sessions.findIndex(s => s.token === token);
    if (index !== -1) {
      this.data.sessions.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Stats
  getStats() {
    return {
      totalProjects: this.data.projects.length,
      activeProjects: this.data.projects.filter(p => p.status === 'ACTIVE').length,
      totalTasks: this.data.tasks.length,
      completedTasks: this.data.tasks.filter(t => t.status === 'DONE').length,
      activeTasks: this.data.tasks.filter(t => t.status !== 'DONE').length,
      totalUsers: this.data.users.filter(u => u.status === 'ACTIVE').length,
      pendingUsers: this.data.users.filter(u => u.status === 'PENDING').length,
    };
  }

  // Reset (for testing)
  reset(): void {
    this.data = {
      users: [],
      projects: [],
      tasks: [],
      comments: [],
      activities: [],
      notifications: [],
      calendarEvents: [],
      conversations: [],
      messages: [],
      sessions: [],
    };
    this.saveToStorage();
  }
}

export const db = new Database();
