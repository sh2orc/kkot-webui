import { initializeDb } from './index';
import { userRepository, chatSessionRepository, chatMessageRepository, apiConnectionRepository, systemSettingsRepository } from './repository';

/**
 * DB Test Code
 * 
 * This file contains code to test DB functionality.
 * How to run: ts-node lib/db/test.ts
 */
async function main() {
  try {
    console.log('Initializing DB...');
    await initializeDb();
    console.log('DB initialization completed');

    // User creation test
    console.log('\n=== User Test ===');
    const user = await userRepository.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
    console.log('User created:', user);

    // User query test
    const users = await userRepository.findAll();
    console.log('All users:', users);

    // Chat session creation test
    console.log('\n=== Chat Session Test ===');
    const userId = users[0].id;
    const session = await chatSessionRepository.create({
      userId: userId,
      title: 'Test Chat'
    });
    console.log('Chat session created:', session);

    // Chat message creation test
    console.log('\n=== Chat Message Test ===');
    const sessionId = session[0].id;
    
    // User message
    const userMessage = await chatMessageRepository.create({
      sessionId: sessionId,
      role: 'user',
      content: 'Hello!'
    });
    console.log('User message created:', userMessage);
    
    // Assistant message
    const assistantMessage = await chatMessageRepository.create({
      sessionId: sessionId,
      role: 'assistant',
      content: 'Hello! How can I help you?'
    });
    console.log('Assistant message created:', assistantMessage);
    
    // Query all messages in session
    const messages = await chatMessageRepository.findBySessionId(sessionId);
    console.log('All messages in session:', messages);

    // API connection creation test
    console.log('\n=== API Connection Test ===');
    const openaiConnection = await apiConnectionRepository.create({
      type: 'openai',
      name: 'OpenAI API',
      url: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      enabled: true
    });
    console.log('OpenAI API connection created:', openaiConnection);
    
    const ollamaConnection = await apiConnectionRepository.create({
      type: 'ollama',
      name: 'Ollama API',
      url: 'http://localhost:11434',
      enabled: false
    });
    console.log('Ollama API connection created:', ollamaConnection);
    
    // Query API connections by type
    const openaiConnections = await apiConnectionRepository.findByType('openai');
    console.log('OpenAI API connection list:', openaiConnections);

    // System settings test
    console.log('\n=== System Settings Test ===');
    await systemSettingsRepository.upsert('theme', 'dark');
    await systemSettingsRepository.upsert('language', 'ko');
    
    const settings = await systemSettingsRepository.findAll();
    console.log('All system settings:', settings);
    
    console.log('\nTest completed');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test
main(); 