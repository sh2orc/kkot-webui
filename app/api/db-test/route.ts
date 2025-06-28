import { NextRequest, NextResponse } from 'next/server';
import { initializeDb, getDb, systemSettingsRepository } from '@/lib/db/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DB Test API
 * 
 * This API tests DB connection and basic CRUD operations.
 * In production environment, this should be removed or secured.
 */

// GET: DB initialization and test
export async function GET(request: NextRequest) {
  try {
    // Initialize DB
    await initializeDb();
    
    return NextResponse.json({
      message: "DB has been successfully initialized.",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('DB initialization error:', error);
    return NextResponse.json(
      { error: 'An error occurred during DB initialization.' },
      { status: 500 }
    );
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
        const result = await systemSettingsRepository.upsert(key, value);
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