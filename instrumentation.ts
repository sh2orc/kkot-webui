export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 서버 사이드에서만 실행
    const { setupOAuthEnvironment } = await import('./lib/oauth-env-setup');
    
    console.log('Initializing OAuth environment...');
    await setupOAuthEnvironment();
  }
}
