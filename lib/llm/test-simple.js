// Simple CommonJS test file
require('dotenv').config();

// Import the factory
const { LLMFactory } = require('./factory');
const { loadEnvironmentConfig } = require('./config');

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
    const messages = [
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

// Run the tests
console.log("=== LLM Library Test ===");
console.log("Environment config:", envConfig);

// Run tests sequentially
(async () => {
  await testOpenAI();
  console.log("\n=== Tests Complete ===");
})().catch(console.error); 