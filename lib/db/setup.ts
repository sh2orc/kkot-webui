import { initializeDb } from './index';

/**
 * DB initialization script
 * 
 * This file contains code to initialize the DB at application startup.
 * It runs automatically when the Next.js server starts.
 */
async function setup() {
  try {
    console.log('Initializing database...');
    await initializeDb();
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization error:', error);
    // In production environment, just log the error without stopping the server
    if (process.env.NODE_ENV !== 'production') {
      throw error;
    }
  }
}

// Run setup
setup(); 