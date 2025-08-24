// This file is for server-side only
import 'server-only';

import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../config';
import * as schema from '../schema';
import { generateId } from './utils';

// Get DB instance
const db = getDb();

// Chat session related functions
export const chatSessionRepository = {
  /**
   * Find all chat sessions
   */
  findAll: async () => {
    return await db.select().from(schema.chatSessions);
  },
  
  /**
   * Find all chat sessions for a user
   */
  findByUserEmail: async (userEmail: string) => {
    return await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.userEmail, userEmail));
  },
  
  /**
   * Find chat session by ID
   */
  findById: async (id: string | number) => {
    return await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, id as any)).limit(1);
  },
  
  /**
   * Create chat session
   */
  create: async (sessionData: { userEmail: string; title: string }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.chatSessions).values({
      id: id as any,
      userEmail: sessionData.userEmail,
      title: sessionData.title,
      createdAt: now as any,
      updatedAt: now as any
    }).returning();
  },
  
  /**
   * Update chat session
   */
  update: async (id: string | number, sessionData: { title?: string }) => {
    return await db.update(schema.chatSessions)
      .set({ ...sessionData, updatedAt: new Date() as any })
      .where(eq(schema.chatSessions.id, id as any))
      .returning();
  },
  
  /**
   * Delete chat session
   */
  delete: async (id: string | number) => {
    return await db.delete(schema.chatSessions).where(eq(schema.chatSessions.id, id as any));
  }
};

// Chat message related functions
export const chatMessageRepository = {
  /**
   * Find all messages
   */
  findAll: async () => {
    return await db.select().from(schema.chatMessages);
  },
  
  /**
   * Find all messages for a session
   */
  findBySessionId: async (sessionId: string | number) => {
    return await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.sessionId, sessionId as any));
  },
  
  /**
   * Create message
   */
  create: async (messageData: { sessionId: string | number; role: 'user' | 'assistant'; content: string }) => {
    const id = generateId();
    const now = new Date();
    
    return await db.insert(schema.chatMessages).values({
      id: id as any,
      sessionId: messageData.sessionId as any,
      role: messageData.role,
      content: messageData.content,
      createdAt: now as any
    }).returning();
  },

  /**
   * Delete message by ID
   */
  delete: async (id: string | number) => {
    return await db.delete(schema.chatMessages).where(eq(schema.chatMessages.id, id as any));
  },

  /**
   * Delete messages from a specific message onwards (for chat regeneration)
   * @param sessionId - Chat session ID
   * @param fromMessageId - Message ID to start deleting from (inclusive)
   */
  deleteFromMessageOnwards: async (sessionId: string | number, fromMessageId: string | number) => {
    console.log('=== deleteFromMessageOnwards called ===');
    console.log('sessionId:', sessionId);
    console.log('fromMessageId:', fromMessageId);
    
    // First, get all messages for the session ordered by creation time
    const allMessages = await db.select().from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId as any))
      .orderBy(schema.chatMessages.createdAt);
    
    console.log('Total messages in session:', allMessages.length);
    
    // Find the index of the target message
    const fromMessageIndex = allMessages.findIndex((msg: any) => msg.id === fromMessageId);
    
    if (fromMessageIndex === -1) {
      console.log('Target message not found, no deletion needed');
      throw new Error('Message not found');
    }
    
    console.log('Found target message at index:', fromMessageIndex);
    
    // Get all message IDs from the target message onwards
    const messagesToDelete = allMessages.slice(fromMessageIndex);
    const messageIds = messagesToDelete.map((msg: any) => msg.id);
    
    console.log('Messages to delete:', messageIds);
    
    if (messageIds.length === 0) {
      console.log('No messages to delete');
      return [];
    }
    
    try {
      // Delete all messages from the target message onwards
      const deleteResult = await db.delete(schema.chatMessages)
        .where(
          messageIds.length === 1 
            ? eq(schema.chatMessages.id, messageIds[0] as any)
            : inArray(schema.chatMessages.id, messageIds as any[])
        )
        .returning();
      
      console.log('Delete operation completed. Deleted count:', deleteResult.length);
      
      // Verify deletion by checking remaining messages
      const remainingMessages = await db.select().from(schema.chatMessages)
        .where(eq(schema.chatMessages.sessionId, sessionId as any))
        .orderBy(schema.chatMessages.createdAt);
      
      console.log('Remaining messages after deletion:', remainingMessages.length);
      
      return deleteResult;
    } catch (error) {
      console.error('Error during message deletion:', error);
      throw error;
    }
  },

  /**
   * Update message rating
   */
  updateRating: async (messageId: string | number, rating: number) => {
    return await db.update(schema.chatMessages)
      .set({ rating: rating })
      .where(eq(schema.chatMessages.id, messageId as any))
      .returning();
  },

  /**
   * Update message content
   */
  updateContent: async (messageId: string | number, content: string) => {
    return await db.update(schema.chatMessages)
      .set({ content: content })
      .where(eq(schema.chatMessages.id, messageId as any))
      .returning();
  }
};
