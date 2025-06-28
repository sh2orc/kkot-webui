// Client-safe exports only
// Do not include any server-only functionality here

// For server components, import from './server' instead
// Client components should not directly use DB functionality

// Export types from types.ts
export * from './types';

// DO NOT export schema, config, or any server-side functions here
// Server components should use './server' imports instead 