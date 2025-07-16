import LLMFactory, { LLMChain, LLMMessage, loadEnvironmentConfig } from "./index";

/**
 * Example using OpenAI
 */
async function openaiExample() {
  try {
    // Load environment configuration
    const envConfig = loadEnvironmentConfig();
    
    // Create OpenAI LLM instance
    const llm = LLMFactory.create({
      provider: "openai",
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
      apiKey: envConfig.openaiApiKey
    });

    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "What is the capital of South Korea?" }
    ];

    // Call LLM
    const response = await llm.chat(messages);
    console.log("OpenAI response:", response.content);
    console.log("Token usage:", response.tokens);
  } catch (error) {
    console.error("OpenAI example error:", error);
  }
}

/**
 * Example using Gemini
 */
async function geminiExample() {
  try {
    // Load environment configuration
    const envConfig = loadEnvironmentConfig();
    
    // Create Gemini LLM instance
    const llm = LLMFactory.create({
      provider: "gemini",
      modelName: "gemini-pro",
      temperature: 0.7,
      apiKey: envConfig.geminiApiKey
    });

    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "user", content: "What is the capital of South Korea?" }
    ];

    // Call LLM
    const response = await llm.chat(messages);
    console.log("Gemini response:", response.content);
    console.log("Token usage:", response.tokens);
  } catch (error) {
    console.error("Gemini example error:", error);
  }
}

/**
 * Example using Ollama
 */
async function ollamaExample() {
  try {
    // Load environment configuration
    const envConfig = loadEnvironmentConfig();
    
    // Create Ollama LLM instance
    const llm = LLMFactory.create({
      provider: "ollama",
      modelName: "llama3",
      temperature: 0.7,
      baseUrl: envConfig.ollamaBaseUrl
    });

    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "What is the capital of South Korea?" }
    ];

    // Call LLM
    const response = await llm.chat(messages);
    console.log("Ollama response:", response.content);
    console.log("Token usage:", response.tokens);
  } catch (error) {
    console.error("Ollama example error:", error);
  }
}

/**
 * Example using LLM chain
 */
async function chainExample() {
  try {
    // Create OpenAI LLM instance using createDefault (which uses environment variables)
    const llm = LLMFactory.createDefault("openai");
    
    // Create LLM chain
    const chain = new LLMChain(llm);
    
    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "What is the capital of South Korea?" }
    ];
    
    // Run chain
    const response = await chain.run(messages);
    console.log("Chain response:", response.content);
    console.log("Token usage:", response.tokens);
  } catch (error) {
    console.error("Chain example error:", error);
  }
}

/**
 * Streaming response example
 */
async function streamingExample() {
  try {
    // Create OpenAI LLM instance using createDefault
    const llm = LLMFactory.createDefault("openai");
    
    // Prepare messages
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful AI assistant." },
      { role: "user", content: "Please briefly describe South Korea." }
    ];
    
    // Streaming callbacks
    const onToken = (token: string) => {
      process.stdout.write(token);
    };
    
    const onComplete = (response: any) => {
      console.log("\n\nStreaming complete, token usage:", response.tokens);
    };
    
    // Streaming call
    await llm.streamChat(messages, { onToken, onComplete });
  } catch (error) {
    console.error("Streaming example error:", error);
  }
}

// Run examples
async function runExamples() {
  console.log("=== OpenAI Example ===");
  await openaiExample();
  
  console.log("\n=== Gemini Example ===");
  await geminiExample();
  
  console.log("\n=== Ollama Example ===");
  await ollamaExample();
  
  console.log("\n=== Chain Example ===");
  await chainExample();
  
  console.log("\n=== Streaming Example ===");
  await streamingExample();
}

// Check if environment is set up
const envConfig = loadEnvironmentConfig();
if (envConfig.openaiApiKey || envConfig.geminiApiKey) {
  runExamples();
} else {
  console.log("To run examples, set OPENAI_API_KEY or GEMINI_API_KEY environment variables.");
} 