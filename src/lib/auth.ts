import type { User, UserRole, PermissionOverrides } from '@/types';
import { db } from '@/server/database';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// JWT-like token generation (simple implementation)
export function generateToken(): string {
  return uuidv4() + '-' + Date.now();
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hashed: string): boolean {
  return bcrypt.compareSync(password, hashed);
}

// Session management
export function createSession(userId: string): string {
  const token = generateToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  db.createSession({ userId, token, expiresAt });
  return token;
}

export function validateSession(token: string): User | null {
  const session = db.getSessionByToken(token);
  if (!session) return null;
  return db.getUserById(session.userId) || null;
}

export function logout(token: string): void {
  db.deleteSession(token);
}

// Permission matrix (default permissions by role)
export const defaultPermissions: Record<UserRole, PermissionOverrides> = {
  ADMIN: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: true,
    createTasks: true,
    editTasks: true,
    deleteTasks: true,
    manageUsers: true,
    viewReports: true,
    accessChat: true,
    changeSettings: true,
    visibility: true,
  },
  MANAGER: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: false, // Own only - handled separately
    createTasks: true,
    editTasks: true,
    deleteTasks: true,
    manageUsers: false,
    viewReports: true,
    accessChat: true,
    changeSettings: true,
    visibility: true,
  },
  EMPLOYEE: {
    createProjects: false,
    editAllProjects: false,
    deleteProjects: false,
    createTasks: true,
    editTasks: false, // Assigned only - handled separately
    deleteTasks: false, // Own only - handled separately
    manageUsers: false,
    viewReports: false, // Own only - handled separately
    accessChat: true,
    changeSettings: true,
    visibility: true,
  },
  GUEST: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: false,
    createTasks: true,
    editTasks: false,
    deleteTasks: false,
    manageUsers: false,
    viewReports: true,
    accessChat: true,
    changeSettings: true,
    visibility: true,
  },
};

// Get effective permissions for a user (role defaults + overrides)
export function getEffectivePermissions(user: User): PermissionOverrides {
  const rolePerms = defaultPermissions[user.role];
  return { ...rolePerms, ...user.permissions };
}

// Check if user has permission
export function hasPermission(
  user: User,
  permission: keyof PermissionOverrides,
  context?: { projectId?: string; taskId?: string; isOwner?: boolean }
): boolean {
  const effectivePerms = getEffectivePermissions(user);
  
  // Check override first
  if (effectivePerms[permission] !== undefined) {
    // Special cases for "own only" permissions
    if (permission === 'deleteProjects' && user.role === 'MANAGER') {
      return context?.isOwner === true;
    }
    if (permission === 'editTasks' && user.role === 'EMPLOYEE') {
      return context?.isOwner === true || false;
    }
    if (permission === 'deleteTasks' && user.role === 'EMPLOYEE') {
      return context?.isOwner === true;
    }
    if (permission === 'viewReports' && user.role === 'EMPLOYEE') {
      return context?.isOwner === true;
    }
    return effectivePerms[permission] || false;
  }
  
  return false;
}

// Check if admin exists
export function adminExists(): boolean {
  return db.hasAdmin();
}

// Register user
export function registerUser(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): { success: boolean; user?: User; error?: string } {
  // Check if email exists
  if (db.getUserByEmail(email)) {
    return { success: false, error: 'Email already registered' };
  }

  // Check admin restriction
  if (role === 'ADMIN' && adminExists()) {
    return { success: false, error: 'Admin already exists' };
  }

  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email,
    password: hashPassword(password),
    fullName,
    role,
    status: role === 'ADMIN' && !adminExists() ? 'ACTIVE' : 'PENDING',
    permissions: {},
    createdAt: now,
    updatedAt: now,
  };

  db.createUser(user);
  return { success: true, user };
}

// Login user
export function loginUser(
  email: string,
  password: string
): { success: boolean; user?: User; token?: string; error?: string } {
  const user = db.getUserByEmail(email);
  
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  if (!verifyPassword(password, user.password)) {
    return { success: false, error: 'Invalid credentials' };
  }

  if (user.status === 'PENDING') {
    return { success: false, error: 'Account pending approval' };
  }

  if (user.status === 'INACTIVE') {
    return { success: false, error: 'Account is inactive' };
  }

  // Update last login
  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

  const token = createSession(user.id);
  return { success: true, user, token };
}

// Approve user
export function approveUser(userId: string): User | null {
  return db.updateUser(userId, { status: 'ACTIVE' }) || null;
}

// Reject user (delete)
export function rejectUser(userId: string): boolean {
  return db.deleteUser(userId);
}
