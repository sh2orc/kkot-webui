import { useState, useCallback } from 'react';

/**
 * DB Hook
 * 
 * 이 훅은 API를 통해 DB 작업을 수행합니다.
 * 클라이언트 컴포넌트에서 DB 작업을 수행할 때 사용됩니다.
 * 
 * @returns DB 작업을 위한 유틸리티 함수들
 */
export function useDb() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // API 호출을 위한 기본 함수
  const fetchApi = useCallback(async (endpoint: string, options?: RequestInit) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/db${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    // DB 작업을 위한 API 호출 함수들
    users: {
      findAll: () => fetchApi('/users'),
      findById: (id: string | number) => fetchApi(`/users/${id}`),
      create: (userData: any) => fetchApi('/users', { method: 'POST', body: JSON.stringify(userData) }),
      update: (id: string | number, userData: any) => fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
      delete: (id: string | number) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
    },
    chatSessions: {
      findByUserId: (userId: string | number) => fetchApi(`/chat-sessions?userId=${userId}`),
      findById: (id: string | number) => fetchApi(`/chat-sessions/${id}`),
      create: (sessionData: any) => fetchApi('/chat-sessions', { method: 'POST', body: JSON.stringify(sessionData) }),
      update: (id: string | number, sessionData: any) => fetchApi(`/chat-sessions/${id}`, { method: 'PUT', body: JSON.stringify(sessionData) }),
      delete: (id: string | number) => fetchApi(`/chat-sessions/${id}`, { method: 'DELETE' }),
    },
    chatMessages: {
      findBySessionId: (sessionId: string | number) => fetchApi(`/chat-messages?sessionId=${sessionId}`),
      create: (messageData: any) => fetchApi('/chat-messages', { method: 'POST', body: JSON.stringify(messageData) }),
    },
    apiConnections: {
      findAll: () => fetchApi('/api-connections'),
      findById: (id: string | number) => fetchApi(`/api-connections/${id}`),
      findByType: (type: string) => fetchApi(`/api-connections?type=${type}`),
      create: (connectionData: any) => fetchApi('/api-connections', { method: 'POST', body: JSON.stringify(connectionData) }),
      update: (id: string | number, connectionData: any) => fetchApi(`/api-connections/${id}`, { method: 'PUT', body: JSON.stringify(connectionData) }),
    },
    systemSettings: {
      findAll: () => fetchApi('/system-settings'),
      findByKey: (key: string) => fetchApi(`/system-settings/${key}`),
      upsert: (key: string, value: string) => fetchApi('/system-settings', { method: 'POST', body: JSON.stringify({ key, value }) }),
    },
  };
} 