import { NextRequest, NextResponse } from 'next/server';
import { adminSettingsRepository } from '@/lib/db/server';

// GET: Retrieve all admin settings or specific setting by key
export async function GET(request: NextRequest) {
  try {
    // DB is automatically initialized at server start, so no need to call it here
    
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (key) {
      try {
        // Retrieve specific setting by key
        const setting = await adminSettingsRepository.findByKey(key);
        if (setting && setting.length > 0) {
          return NextResponse.json(setting[0]);
        }
        
        // Return default values for specific keys instead of 404
        const defaultValues: Record<string, string> = {
          'app.name': 'kkot-webui',
          'system.gmtOffsetMinutes': '0',
        };
        
        if (defaultValues[key]) {
          return NextResponse.json({ 
            key, 
            value: defaultValues[key],
            message: 'Default value used as setting not found.'
          });
        }
        
        return NextResponse.json({ message: 'Setting not found.', key }, { status: 404 });
      } catch (dbError) {
        console.error(`Error retrieving key ${key}:`, dbError);
        // Database error occurred, but responding with empty result for normal response
        return NextResponse.json({ 
          key,
          value: null,
          message: 'Setting not found.'
        });
      }
          } else {
      // Retrieve all settings
      try {
        const settings = await adminSettingsRepository.findAll();
        return NextResponse.json(settings);
      } catch (dbError) {
        console.error('Error retrieving all settings:', dbError);
        // Database error occurred, but responding with empty array for normal response
        return NextResponse.json([]);
      }
    }
  } catch (error) {
    console.error('Error retrieving admin settings:', error);
    
    // Return empty array if the table doesn't exist
    if (error instanceof Error && error.message.includes('no such table')) {
      console.log('Admin settings table does not exist.');
      return NextResponse.json([]);
    }
    
    // Handle general errors with normal response (to facilitate error handling on client side)
    return NextResponse.json(
      { error: 'An error occurred while retrieving admin settings.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }  // Return 200 response to prevent JSON parsing errors on client side
    );
  }
}

// POST: Create or update settings
export async function POST(request: NextRequest) {
  try {
    // DB is automatically initialized at server start, so no need to call it here
    
    const body = await request.json();

    // Validate required fields
    if (!body.key || body.value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required.' },
        { status: 400 }
      );
    }

    try {
      // Create or update setting
      const result = await adminSettingsRepository.upsert(body.key, body.value);
            
      return NextResponse.json({
        message: 'Setting has been updated.',
        data: result[0]
      });
    } catch (dbError) {
      console.error('Database error while updating settings:', dbError);
      // Error response but maintaining JSON format
      return NextResponse.json({
        error: 'A database error occurred while saving the setting.',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 200 });  // Return 200 response to prevent JSON parsing errors on client side
    }
  } catch (error) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating admin settings.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }  // Return 200 response to prevent JSON parsing errors on client side
    );
  }
}

// Endpoint for updating multiple settings at once
export async function PUT(request: NextRequest) {
  try {
    // DB is automatically initialized at server start, so no need to call it here
    
    const body = await request.json();
    
    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json(
        { error: 'settings array is required.' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];
    
    // Execute upsert for each setting
    for (const setting of body.settings) {
      if (!setting.key || setting.value === undefined) {
        errors.push({ key: setting.key || 'unknown', error: 'Key and value are required.' });
        continue;
      }
      
      try {
        const result = await adminSettingsRepository.upsert(setting.key, setting.value);
        results.push(result[0]);
      } catch (err) {
        console.error(`Error updating setting ${setting.key}:`, err);
        errors.push({ key: setting.key, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }
    
    
    return NextResponse.json({
      message: 'Settings have been updated.',
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error during batch update of admin settings:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating admin settings.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }  // Return 200 response to prevent JSON parsing errors on client side
    );
  }
} 