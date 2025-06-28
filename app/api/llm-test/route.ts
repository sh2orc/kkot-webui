import { NextRequest, NextResponse } from 'next/server';
import { initializeDb, llmServerRepository } from '@/lib/db/server';

// GET: LLM test endpoint
export async function GET(request: NextRequest) {
  try {
    // Verify DB initialization
    await initializeDb();
    
    // Get LLM server information
    const servers = await llmServerRepository.findAll();
    const enabledServers = await llmServerRepository.findEnabled();
    const defaultServer = await llmServerRepository.findDefault();
    
    return NextResponse.json({
      success: true,
      results: {
        totalServers: servers.length,
        enabledServers: enabledServers.length,
        defaultServer: defaultServer.length > 0 ? defaultServer[0] : null,
        serversByProvider: servers.reduce((acc: any, server: any) => {
          if (!acc[server.provider]) {
            acc[server.provider] = 0;
          }
          acc[server.provider]++;
          return acc;
        }, {}),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('LLM test error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error has occurred.'
    }, { status: 500 });
  }
} 