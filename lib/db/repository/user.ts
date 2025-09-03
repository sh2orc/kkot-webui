// This file is for server-side only
import 'server-only';

import { eq, desc, asc } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { activityLogs } from '../schema';
import { generateId } from './utils';
import { nanoid } from 'nanoid';

// Get DB instance
const db = getDb();

// User related functions
export const userRepository = {
  /**
   * Get all users
   */
  findAll: async () => {
    return await db.select().from(schema.users);
  },
  
  /**
   * Find user by ID
   */
  findById: async (id: string | number) => {
    return await db.select().from(schema.users).where(eq(schema.users.id, id as any)).limit(1);
  },
  
  /**
   * Find user by email
   */
  findByEmail: async (email: string) => {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0] || null;
  },
  
  /**
   * Create user
   */
  create: async (userData: { username: string; email: string; password: string; role?: string; department?: string; phone_number?: string; status?: string; email_verified?: number }) => {
    const id = generateId();
    const now = new Date();
    
    // The actual database has TEXT id, not INTEGER
    return await db.insert(schema.users).values({
      id: id as any,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'user',
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },
  
  /**
   * Update user
   */
  update: async (id: string | number, userData: Partial<{ 
    username: string; 
    email: string; 
    password: string; 
    role: string; 
    profileImage?: string | null; 
    department?: string; 
    phone_number?: string; 
    status?: string; 
    email_verified?: number; 
    failed_login_attempts?: number; 
    locked_until?: any;
    // OAuth fields
    googleId?: string;
    oauthProvider?: string;
    oauthLinkedAt?: Date;
    oauthProfilePicture?: string;
    // Login tracking
    lastLoginAt?: Date;
  }>) => {
    return await db.update(schema.users)
      .set({ ...userData, updatedAt: new Date() as any })
      .where(eq(schema.users.id, id as any))
      .returning();
  },
  
  /**
   * Delete user
   */
  delete: async (id: string | number) => {
    return await db.delete(schema.users).where(eq(schema.users.id, id as any));
  },

  /**
   * Update last login time
   */
  updateLastLogin: async (id: string | number) => {
    const now = new Date();
    console.log('🔍 Updating lastLoginAt for user:', id, 'with timestamp:', now.getTime(), 'Date:', now.toISOString());
    return await db.update(schema.users)
      .set({ lastLoginAt: now as any })
      .where(eq(schema.users.id, id as any))
      .returning();
  },

  /**
   * Get all roles
   */
  getAllRoles: async () => {
    // Temporary implementation - returns hardcoded roles
    return [
      { id: 'admin', name: '관리자', description: '모든 권한을 가진 시스템 관리자', is_system: true, permissions: [] },
      { id: 'manager', name: '매니저', description: '사용자 및 컨텐츠 관리 권한', is_system: true, permissions: [] },
      { id: 'user', name: '일반 사용자', description: '기본 사용 권한', is_system: true, permissions: [] },
      { id: 'guest', name: '게스트', description: '제한된 읽기 권한', is_system: true, permissions: [] }
    ];
  },

  /**
   * Get all permissions
   */
  getAllPermissions: async () => {
    // Temporary implementation - returns hardcoded permissions
    return [
      { id: 'system.admin', name: '시스템 관리', description: '시스템 전체 관리 권한', category: 'system' },
      { id: 'system.settings', name: '설정 관리', description: '시스템 설정 변경 권한', category: 'system' },
      { id: 'users.create', name: '사용자 생성', description: '새 사용자 계정 생성', category: 'admin' },
      { id: 'users.read', name: '사용자 조회', description: '사용자 정보 조회', category: 'admin' },
      { id: 'users.update', name: '사용자 수정', description: '사용자 정보 수정', category: 'admin' },
      { id: 'users.delete', name: '사용자 삭제', description: '사용자 계정 삭제', category: 'admin' },
      { id: 'users.manage_roles', name: '권한 관리', description: '사용자 권한 할당 및 변경', category: 'admin' },
      { id: 'chat.create', name: '채팅 생성', description: '새 채팅 세션 생성', category: 'chat' },
      { id: 'chat.read', name: '채팅 조회', description: '채팅 내역 조회', category: 'chat' },
      { id: 'chat.delete', name: '채팅 삭제', description: '채팅 세션 삭제', category: 'chat' },
      { id: 'rag.create', name: 'RAG 생성', description: 'RAG 시스템 설정 생성', category: 'rag' },
      { id: 'rag.read', name: 'RAG 조회', description: 'RAG 설정 조회', category: 'rag' },
      { id: 'rag.update', name: 'RAG 수정', description: 'RAG 설정 수정', category: 'rag' },
      { id: 'rag.delete', name: 'RAG 삭제', description: 'RAG 설정 삭제', category: 'rag' },
      { id: 'api.create', name: 'API 키 생성', description: 'API 접근 키 생성', category: 'api' },
      { id: 'api.manage', name: 'API 관리', description: 'API 설정 관리', category: 'api' }
    ];
  },

  /**
   * Get user roles
   */
  getUserRoles: async (userId: string) => {
    // Temporary implementation - returns role based on user's role field
    const users = await db.select().from(schema.users).where(eq(schema.users.id, userId as any)).limit(1);
    const user = users[0];
    if (!user) return [];
    
    const allRoles = await userRepository.getAllRoles();
    return allRoles.filter(role => role.id === user.role);
  },

  /**
   * Update user roles
   */
  updateUserRoles: async (userId: string, roleIds: string[]) => {
    // Temporary implementation - update user's role field with first role
    if (roleIds.length > 0) {
      await db.update(schema.users)
        .set({ role: roleIds[0], updatedAt: new Date() as any })
        .where(eq(schema.users.id, userId as any));
    }
  },

  /**
   * Get role by ID
   */
  getRoleById: async (roleId: string) => {
    const roles = await userRepository.getAllRoles();
    return roles.find(role => role.id === roleId);
  },

  /**
   * Create role
   */
  createRole: async (roleData: { name: string; description: string; is_system: number }) => {
    // Temporary implementation - throw error as we can't create roles without proper tables
    throw new Error('Role creation not implemented yet');
  },

  /**
   * Update role
   */
  updateRole: async (roleId: string, roleData: { name?: string; description?: string }) => {
    // Temporary implementation - throw error as we can't update roles without proper tables
    throw new Error('Role update not implemented yet');
  },

  /**
   * Delete role
   */
  deleteRole: async (roleId: string) => {
    // Temporary implementation - throw error as we can't delete roles without proper tables
    throw new Error('Role deletion not implemented yet');
  },

  /**
   * Update role permissions
   */
  updateRolePermissions: async (roleId: string, permissionIds: string[]) => {
    // Temporary implementation - no-op
  },

  /**
   * Assign permissions to role
   */
  assignPermissionsToRole: async (roleId: string, permissionIds: string[]) => {
    // Temporary implementation - no-op
  },

  /**
   * Assign roles to user
   */
  assignRoles: async (userId: string, roleIds: string[]) => {
    await userRepository.updateUserRoles(userId, roleIds);
  },

  /**
   * Bulk update user status
   */
  bulkUpdateStatus: async (userIds: string[], status: string) => {
    // Temporary implementation - we need to add status field to users table
    for (const userId of userIds) {
      await db.update(schema.users)
        .set({ updatedAt: new Date() as any })
        .where(eq(schema.users.id, userId as any));
    }
  },

  /**
   * Bulk delete users
   */
  bulkDelete: async (userIds: string[]) => {
    for (const userId of userIds) {
      await db.delete(schema.users).where(eq(schema.users.id, userId as any));
    }
  },

  /**
   * Get user activity logs
   */
  getUserActivityLogs: async (userId: string, options?: { limit?: number; orderBy?: string; order?: 'ASC' | 'DESC' }) => {
    try {
      const { limit = 50, orderBy = 'created_at', order = 'DESC' } = options || {};
      
      const query = db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId))
        .limit(limit);

      if (orderBy === 'created_at') {
        query.orderBy(order === 'DESC' ? desc(activityLogs.createdAt) : asc(activityLogs.createdAt));
      }

      return await query;
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      return [];
    }
  },

  /**
   * Log activity
   */
  logActivity: async (data: { user_id: string; action: string; resource_type?: string; resource_id?: string; ip_address?: string; user_agent?: string }) => {
    try {
      const newActivity = {
        id: nanoid(),
        userId: data.user_id,
        action: data.action,
        resourceType: data.resource_type || null,
        resourceId: data.resource_id || null,
        ipAddress: data.ip_address || null,
        userAgent: data.user_agent || null,
        createdAt: new Date(),
      };

      await db.insert(activityLogs).values(newActivity);
      return newActivity;
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
};
