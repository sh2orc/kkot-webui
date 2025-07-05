import { NextRequest, NextResponse } from 'next/server';
import { initializeDb, getDb, adminSettingsRepository, userRepository } from '@/lib/db/server';
import { getDbConfig } from '@/lib/db/config';

/**
 * DB Test API
 * 
 * This API tests DB connection and basic operations.
 * In production environment, this should be removed or secured.
 */

// GET: DB connection test
export async function GET(request: NextRequest) {
  try {
    // Initialize database
    await initializeDb();
    
    // Get database configuration
    const dbConfig = getDbConfig();
    
    // Test basic database operations
    const existingUsers = await userRepository.findAll();
    
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    return NextResponse.json({
      success: true,
      results: {
        dbType: dbConfig.type,
        dbUrl: dbConfig.url,
        existingUsers: existingUsers,
        timestamp: timestamp
      }
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
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