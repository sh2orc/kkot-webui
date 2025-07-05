import { LLMFactory } from './factory';
import { LLMMessage } from './types';

/**
 * Example usage of maxTokens option
 */
async function exampleMaxTokensUsage() {
  // Create LLM client
  const llmClient = LLMFactory.create({
    provider: 'openai',
    modelName: 'gpt-3.5-turbo',
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
    temperature: 0.7,
    maxTokens: 1024 // Default maxTokens setting
  });

  const messages: LLMMessage[] = [
    {
      role: 'user',
      content: 'Please explain artificial intelligence briefly.'
    }
  ];

  try {
    // 1. Use default maxTokens (1024)
    console.log('=== Using default maxTokens (1024) ===');
    const response1 = await llmClient.chat(messages);
    console.log('Response:', response1.content);
    console.log('Token usage:', response1.tokens);

    // 2. Limit maxTokens to 50 for short responses
    console.log('\n=== Limiting maxTokens to 50 ===');
    const response2 = await llmClient.chat(messages, { maxTokens: 50 });
    console.log('Response:', response2.content);
    console.log('Token usage:', response2.tokens);

    // 3. Increase maxTokens to 2000 for long responses
    console.log('\n=== Increasing maxTokens to 2000 ===');
    const longMessages: LLMMessage[] = [
      {
        role: 'user',
        content: 'Please explain in detail about the history, current state, and future prospects of artificial intelligence.'
      }
    ];
    const response3 = await llmClient.chat(longMessages, { maxTokens: 2000 });
    console.log('Response:', response3.content);
    console.log('Token usage:', response3.tokens);

    // 4. Use maxTokens in streaming
    console.log('\n=== Using maxTokens in streaming ===');
    await llmClient.streamChat(messages, {
      onToken: (token) => {
        process.stdout.write(token);
      },
      onComplete: (response) => {
        console.log('\nStreaming completed');
        console.log('Token usage:', response.tokens);
      },
      onError: (error) => {
        console.error('Streaming error:', error);
      }
    }, { maxTokens: 100 }); // Limit to 100 tokens

  } catch (error) {
    console.error('Error occurred:', error);
  }
}

// Example execution (uncomment to test)
// exampleMaxTokensUsage();

export { exampleMaxTokensUsage }; 