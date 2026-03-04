import type { User, Message, Notification, Task, Project, Activity } from '@/types';

// Event types
export type ServerEvent =
  | 'user:pendingCreated'
  | 'user:approved'
  | 'user:rejected'
  | 'user:updated'
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:statusChanged'
  | 'task:assigned'
  | 'comment:created'
  | 'comment:updated'
  | 'comment:deleted'
  | 'activity:created'
  | 'notification:created'
  | 'notification:read'
  | 'message:created'
  | 'message:updated'
  | 'message:deleted'
  | 'typing:start'
  | 'typing:stop'
  | 'calendar:eventCreated'
  | 'calendar:eventUpdated'
  | 'calendar:eventDeleted';

export type ClientEvent =
  | 'subscribe'
  | 'unsubscribe'
  | 'typing:start'
  | 'typing:stop'
  | 'message:send'
  | 'message:edit'
  | 'message:delete'
  | 'task:update'
  | 'task:create'
  | 'task:delete'
  | 'task:statusChanged'
  | 'project:update'
  | 'project:create'
  | 'project:delete'
  | 'comment:create'
  | 'comment:update'
  | 'comment:delete'
  | 'calendar:eventCreate'
  | 'calendar:eventUpdate'
  | 'calendar:eventDelete'
  | 'user:pendingCreated'
  | 'user:approved'
  | 'user:rejected'
  | 'activity:created'
  | 'notification:created';

// Mock WebSocket server for client-side
class MockWebSocketServer {
  private listeners: Map<ServerEvent, Set<(data: any) => void>> = new Map();
  private connected = false;

  connect() {
    this.connected = true;
    console.log('[WebSocket] Connected to mock server');
  }

  disconnect() {
    this.connected = false;
    console.log('[WebSocket] Disconnected from mock server');
  }

  on(event: ServerEvent, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: ServerEvent, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: ServerEvent, data: any) {
    if (!this.connected) return;
    
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('[WebSocket] Error in listener:', e);
        }
      });
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Singleton instance
const mockServer = new MockWebSocketServer();

// Client-side WebSocket hook
export class WebSocketClient {
  private server: MockWebSocketServer;
  private userId: string | null = null;

  constructor() {
    this.server = mockServer;
  }

  connect(userId: string) {
    this.userId = userId;
    this.server.connect();
    
    // Simulate connection
    console.log(`[WebSocket] User ${userId} connected`);
  }

  disconnect() {
    this.server.disconnect();
    this.userId = null;
  }

  // Subscribe to events
  on(event: ServerEvent, callback: (data: any) => void) {
    this.server.on(event, callback);
  }

  off(event: ServerEvent, callback: (data: any) => void) {
    this.server.off(event, callback);
  }

  // Emit events to server
  emit(event: ClientEvent, data: any) {
    if (!this.server.isConnected()) return;
    
    console.log(`[WebSocket] Emitting ${event}:`, data);
    
    // Handle different event types
    switch (event) {
      case 'message:send':
        this.broadcast('message:created', data);
        break;
      case 'typing:start':
        this.broadcast('typing:start', { ...data, userId: this.userId });
        break;
      case 'typing:stop':
        this.broadcast('typing:stop', { ...data, userId: this.userId });
        break;
      case 'task:update':
        this.broadcast('task:updated', data);
        break;
      case 'task:create':
        this.broadcast('task:created', data);
        break;
      case 'task:delete':
        this.broadcast('task:deleted', data);
        break;
      case 'project:update':
        this.broadcast('project:updated', data);
        break;
      case 'project:create':
        this.broadcast('project:created', data);
        break;
      case 'project:delete':
        this.broadcast('project:deleted', data);
        break;
      case 'comment:create':
        this.broadcast('comment:created', data);
        break;
      case 'calendar:eventCreate':
        this.broadcast('calendar:eventCreated', data);
        break;
      case 'calendar:eventUpdate':
        this.broadcast('calendar:eventUpdated', data);
        break;
      case 'calendar:eventDelete':
        this.broadcast('calendar:eventDeleted', data);
        break;
    }
  }

  private broadcast(event: ServerEvent, data: any) {
    // Simulate network delay
    setTimeout(() => {
      this.server.emit(event, data);
    }, 100);
  }

  isConnected() {
    return this.server.isConnected();
  }
}

// Singleton instance for the client
export const wsClient = new WebSocketClient();

// Helper functions for broadcasting events
export function broadcastUserPending(user: User) {
  mockServer.emit('user:pendingCreated', user);
}

export function broadcastUserApproved(user: User) {
  mockServer.emit('user:approved', user);
}

export function broadcastUserRejected(userId: string) {
  mockServer.emit('user:rejected', { userId });
}

export function broadcastProjectCreated(project: Project) {
  mockServer.emit('project:created', project);
}

export function broadcastProjectUpdated(project: Project) {
  mockServer.emit('project:updated', project);
}

export function broadcastProjectDeleted(projectId: string) {
  mockServer.emit('project:deleted', { projectId });
}

export function broadcastTaskCreated(task: Task) {
  mockServer.emit('task:created', task);
}

export function broadcastTaskUpdated(task: Task) {
  mockServer.emit('task:updated', task);
}

export function broadcastTaskDeleted(taskId: string) {
  mockServer.emit('task:deleted', { taskId });
}

export function broadcastTaskStatusChanged(taskId: string, oldStatus: string, newStatus: string) {
  mockServer.emit('task:statusChanged', { taskId, oldStatus, newStatus });
}

export function broadcastCommentCreated(comment: any) {
  mockServer.emit('comment:created', comment);
}

export function broadcastMessageCreated(message: Message) {
  mockServer.emit('message:created', message);
}

export function broadcastNotificationCreated(notification: Notification) {
  mockServer.emit('notification:created', notification);
}

export function broadcastActivityCreated(activity: Activity) {
  mockServer.emit('activity:created', activity);
}
