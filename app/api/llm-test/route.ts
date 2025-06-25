import { NextResponse } from 'next/server';
import LLMFactory, { LLMMessage } from '@/lib/llm';

export async function GET() {
  try {
    // Create OpenAI LLM instance
    const llm = LLMFactory.createDefault("openai");
    
    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "Hello, please respond with a short greeting." }
    ];
    
    // Call LLM
    const response = await llm.chat(messages);
    
    return NextResponse.json({
      success: true,
      content: response.content,
      tokens: response.tokens,
      modelName: response.modelName,
      provider: response.provider
    });
  } catch (error) {
    console.error("LLM test failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 