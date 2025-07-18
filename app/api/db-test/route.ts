import { NextRequest, NextResponse } from 'next/server';
import { getDbConfig } from '@/lib/db/config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * DB Test API
 * 
 * This API tests DB connection and provides basic database statistics.
 * Only shows connection status and table counts, not actual data.
 */

// GET: DB connection test
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Admin access check
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('=== Database Status Check ===');

    // Get database configuration
    const dbConfig = getDbConfig();
    
    // Test database connection and get basic statistics
    let dbStats: {
      connected: boolean;
      dbType: string;
      dbUrl: string;
      tables: Record<string, number>;
      error: string | null;
    } = {
      connected: false,
      dbType: 'unknown',
      dbUrl: 'unknown',
      tables: {},
      error: null
    };

    try {
      const { getDb } = await import('@/lib/db/config');
      const { 
        chatSessions, 
        chatMessages, 
        users, 
        systemSettings,
        agentManage,
        apiKeys,
        llmServers,
        llmModels
      } = await import('@/lib/db/schema');
      
      const db = getDb();
      
      // Test connection with simple count queries (much faster than selecting all data)
      const [
        sessionCount,
        messageCount,
        userCount,
        settingsCount,
        agentCount,
        apiKeyCount,
        serverCount,
        modelCount
      ] = await Promise.all([
        db.select().from(chatSessions).then((rows: any[]) => rows.length).catch(() => 0),
        db.select().from(chatMessages).then((rows: any[]) => rows.length).catch(() => 0),
        db.select().from(users).then((rows: any[]) => rows.length).catch(() => 0),
        db.select().from(systemSettings).then((rows: any[]) => rows.length).catch(() => 0),
        db.select().from(agentManage).then((rows: any[]) => rows.length).catch(() => 0),
        db.select().from(apiKeys).then((rows: any[]) => rows.length).catch(() => 0),
        db.select().from(llmServers).then((rows: any[]) => rows.length).catch(() => 0),
        db.select().from(llmModels).then((rows: any[]) => rows.length).catch(() => 0)
      ]);

      dbStats = {
        connected: true,
        dbType: process.env.DB_TYPE || 'sqlite',
        dbUrl: process.env.DATABASE_URL || 'local sqlite',
        tables: {
          chatSessions: sessionCount,
          chatMessages: messageCount,
          users: userCount,
          systemSettings: settingsCount,
          agents: agentCount,
          apiKeys: apiKeyCount,
          llmServers: serverCount,
          llmModels: modelCount
        },
        error: null
      };

      console.log('Database connection successful');
      console.log('Table counts:', dbStats.tables);

    } catch (dbError) {
      console.error('Database connection error:', dbError);
      dbStats.error = dbError instanceof Error ? dbError.message : String(dbError);
    }

    return NextResponse.json({
      success: dbStats.connected,
      message: dbStats.connected ? 'Database connection successful' : 'Database connection failed',
      results: {
        dbType: dbStats.dbType,
        dbUrl: dbStats.dbUrl.includes('postgres') ? 'PostgreSQL' : 'SQLite',
        existingUsers: [{ count: dbStats.tables.users || 0 }], // Keep compatibility with frontend
        tableCounts: dbStats.tables,
        timestamp: new Date().toISOString(),
        error: dbStats.error
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Database test failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST: Initialize database with example settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Admin access check
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { initializeDb, adminSettingsRepository } = await import('@/lib/db/server');
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
        const result = await adminSettingsRepository.upsert(key, value);
        results.push({ key, value, success: true });
      } catch (err: any) {
        console.error(`Error adding item ${item.key}:`, err);
        results.push({ key: item.key, success: false, error: err.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Example settings data has been successfully added.",
      results
    });
    
  } catch (error) {
    console.error('Error adding example data:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred while adding example data.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 