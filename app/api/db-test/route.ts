import { NextRequest, NextResponse } from 'next/server';
import { initializeDb, getDb, adminSettingsRepository, userRepository } from '@/lib/db/server';
import { getDbConfig } from '@/lib/db/config';
import { chatSessionRepository, chatMessageRepository } from '@/lib/db/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * DB Test API
 * 
 * This API tests DB connection and basic operations.
 * In production environment, this should be removed or secured.
 */

// GET: DB connection test
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    console.log('=== Database Test API ===');
    console.log('Current user email:', session.user.email);

    // Get all chat sessions for current user
    const userSessions = await chatSessionRepository.findByUserEmail(session.user.email);
    console.log('User sessions:', userSessions);

    // Get all chat sessions (for debugging) - use direct DB query
    let allSessions = []
    let allMessages = []
    
    try {
      // Direct database query to get all sessions
      const { getDb } = await import('@/lib/db/config')
      const { chatSessions, chatMessages } = await import('@/lib/db/schema')
      const db = getDb()
      
      allSessions = await db.select().from(chatSessions).limit(20)
      console.log('All sessions:', allSessions)
      
      allMessages = await db.select().from(chatMessages).limit(20)
      console.log('All messages:', allMessages)
    } catch (dbError) {
      console.error('Direct DB query error:', dbError)
    }

    return NextResponse.json({
      success: true,
      currentUser: session.user.email,
      userSessions,
      allSessions,
      allMessages: allMessages.slice(0, 10), // Limit to first 10 messages
      counts: {
        userSessions: userSessions.length,
        allSessions: allSessions.length,
        allMessages: allMessages.length
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      error: 'Database test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST: Add example system settings data
export async function POST(request: NextRequest) {
  try {
    await initializeDb();
    
    // Example system settings data
    const exampleData = [
      { key: 'app.name', value: 'kkot-webui' },
      { key: 'auth.signupEnabled', value: 'true' },
      { key: 'auth.apiKeyEnabled', value: 'true' },
      { key: 'auth.apiKeyEndpointLimited', value: 'false' },
      { key: 'auth.jwtExpiry', value: '-1' }
    ];
    
    // Add settings
    const results = [];
    for (const item of exampleData) {
      try {
        const { key, value } = item;
        
        // Save data using repository
        const result = await adminSettingsRepository.upsert(key, value);
        results.push({ key, value, success: true });
      } catch (err: any) {
        console.error(`Error adding item ${item.key}:`, err);
        results.push({ key: item.key, success: false, error: err.message });
      }
    }
    
    return NextResponse.json({
      message: "Example settings data has been successfully added.",
      results
    });
    
  } catch (error) {
    console.error('Error adding example data:', error);
    return NextResponse.json(
      { error: 'An error occurred while adding example data.' },
      { status: 500 }
    );
  }
} 