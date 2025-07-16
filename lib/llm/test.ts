import dotenv from 'dotenv';
import LLMFactory, { LLMMessage, LLMResponse, loadEnvironmentConfig } from './index';

// Load environment variables
dotenv.config();

// Get environment configuration
const envConfig = loadEnvironmentConfig();

/**
 * Test OpenAI LLM
 */
async function testOpenAI() {
  console.log("Testing OpenAI...");
  
  if (!envConfig.openaiApiKey) {
    console.log("⚠️ OpenAI API key not found. Skipping OpenAI test.");
    return;
  }
  
  try {
    // Create OpenAI LLM instance
    const llm = LLMFactory.createDefault("openai");
    
    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "Hello, please respond with a short greeting." }
    ];
    
    console.log("Sending request to OpenAI...");
    const response = await llm.chat(messages);
    
    console.log("✅ OpenAI Response:");
    console.log("Content:", response.content);
    console.log("Token usage:", response.tokens);
  } catch (error) {
    console.error("❌ OpenAI test failed:", error);
  }
}

/**
 * Test Gemini LLM
 */
async function testGemini() {
  console.log("\nTesting Gemini...");
  
  if (!envConfig.geminiApiKey) {
    console.log("⚠️ Gemini API key not found. Skipping Gemini test.");
    return;
  }
  
  try {
    // Create Gemini LLM instance
    const llm = LLMFactory.createDefault("gemini");
    
    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "user", content: "Hello, please respond with a short greeting." }
    ];
    
    console.log("Sending request to Gemini...");
    const response = await llm.chat(messages);
    
    console.log("✅ Gemini Response:");
    console.log("Content:", response.content);
    console.log("Token usage:", response.tokens);
  } catch (error) {
    console.error("❌ Gemini test failed:", error);
  }
}

/**
 * Test Ollama LLM
 */
async function testOllama() {
  console.log("\nTesting Ollama...");
  
  try {
    // Create Ollama LLM instance
    const llm = LLMFactory.createDefault("ollama");
    
    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "Hello, please respond with a short greeting." }
    ];
    
    console.log("Sending request to Ollama...");
    console.log("(This may fail if Ollama is not running locally)");
    
    // Set a timeout for Ollama request
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 5000)
    );
    
    const responsePromise = llm.chat(messages);
    
    // Race between the request and the timeout
    const response = await Promise.race([responsePromise, timeoutPromise]) as LLMResponse;
    
    console.log("✅ Ollama Response:");
    console.log("Content:", response.content);
    console.log("Token usage:", response.tokens);
  } catch (error) {
    console.error("❌ Ollama test failed:", error);
    console.log("Note: This is expected if you don't have Ollama running locally");
  }
}

/**
 * Test streaming
 */
async function testStreaming() {
  console.log("\nTesting streaming with OpenAI...");
  
  if (!envConfig.openaiApiKey) {
    console.log("⚠️ OpenAI API key not found. Skipping streaming test.");
    return;
  }
  
  try {
    // Create OpenAI LLM instance
    const llm = LLMFactory.createDefault("openai");
    
    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "Count from 1 to 5 and say goodbye." }
    ];
    
    console.log("Sending streaming request to OpenAI...");
    console.log("Response: ");
    
    // Stream the response
    await llm.streamChat(messages, {
      onToken: (token) => {
        process.stdout.write(token);
      },
      onComplete: (response) => {
        console.log("\n\n✅ Streaming complete");
        console.log("Token usage:", response.tokens);
      },
      onError: (error) => {
        console.error("\n❌ Streaming error:", error);
      }
    });
  } catch (error) {
    console.error("❌ Streaming test failed:", error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("=== LLM Library Test ===");
  console.log("Environment config:", envConfig);
  
  await testOpenAI();
  await testGemini();
  await testOllama();
  await testStreaming();
  
  console.log("\n=== Tests Complete ===");
}

// Run the tests
runTests().catch(console.error); 