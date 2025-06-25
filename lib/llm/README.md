# TypeScript LLM Standard Library

This library provides a standard interface for using various LLM (Large Language Model) providers in TypeScript. Built on LangChain and LangGraph, it supports the following LLM providers:

- OpenAI
- Google Gemini
- Ollama
- vLLM (OpenAI-compatible API)

## Installation

```bash
npm install langchain @langchain/openai @langchain/community @langchain/core @langchain/langgraph
```

You may need to install additional packages depending on the provider you need:

```bash
# For Google Gemini
npm install @langchain/google-genai
```

## Basic Usage

### Creating LLM Instances

```typescript
import LLMFactory from './lib/llm';

// Create OpenAI instance
const openaiLLM = LLMFactory.create({
  provider: "openai",
  modelName: "gpt-3.5-turbo",
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY
});

// Create Gemini instance
const geminiLLM = LLMFactory.create({
  provider: "gemini",
  modelName: "gemini-pro",
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY
});

// Create Ollama instance
const ollamaLLM = LLMFactory.create({
  provider: "ollama",
  modelName: "llama3",
  baseUrl: "http://localhost:11434"
});

// Create vLLM instance
const vllmLLM = LLMFactory.create({
  provider: "vllm",
  modelName: "llama3",
  baseUrl: "http://localhost:8000/v1"
});

// Create instance with default settings
const defaultLLM = LLMFactory.createDefault("openai", process.env.OPENAI_API_KEY);
```

### Sending Messages and Receiving Responses

```typescript
import { LLMMessage } from './lib/llm';

// Prepare messages
const messages: LLMMessage[] = [
  { role: "system", content: "You are a helpful AI assistant." },
  { role: "user", content: "What is the capital of South Korea?" }
];

// Call LLM
const response = await openaiLLM.chat(messages);
console.log("Response:", response.content);
console.log("Token usage:", response.tokens);
```

### Streaming Responses

```typescript
// Streaming callbacks
const onToken = (token: string) => {
  process.stdout.write(token); // Output tokens in real-time
};

const onComplete = (response: any) => {
  console.log("\nStreaming complete, token usage:", response.tokens);
};

const onError = (error: Error) => {
  console.error("Streaming error:", error);
};

// Streaming call
await openaiLLM.streamChat(messages, { onToken, onComplete, onError });
```

### Using LLM Chains

```typescript
import { LLMChain } from './lib/llm';

// Create LLM chain
const chain = new LLMChain(openaiLLM);

// Run chain
const response = await chain.run(messages);
console.log("Chain response:", response.content);
```

## Function Calling

```typescript
// Define functions
const functions = {
  functions: [
    {
      name: "get_weather",
      description: "Get current weather information",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name, e.g., Seoul, Busan"
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "Temperature unit"
          }
        },
        required: ["location"]
      }
    }
  ]
};

// Force function call
const forceFunctionCall = {
  functions: functions.functions,
  forceFunctionName: "get_weather"
};

// Call LLM with function calling
const response = await openaiLLM.chat(messages, { functions });
```

## Environment Variables

Create a `.env` file in your project root with the following variables:

```
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434

# vLLM Configuration
VLLM_BASE_URL=http://localhost:8000/v1

# Default Provider (openai, gemini, ollama, vllm)
DEFAULT_LLM_PROVIDER=openai

# Default Model Names
DEFAULT_OPENAI_MODEL=gpt-3.5-turbo
DEFAULT_GEMINI_MODEL=gemini-pro
DEFAULT_OLLAMA_MODEL=llama3
DEFAULT_VLLM_MODEL=llama3

# Model Parameters
DEFAULT_TEMPERATURE=0.7
DEFAULT_MAX_TOKENS=1024
DEFAULT_TOP_P=1.0
```

## Advanced Settings

### Updating Model Configuration

```typescript
openaiLLM.updateConfig({
  temperature: 0.9,
  maxTokens: 2048
});
```

## Example Code

For more examples, refer to the `example.ts` file.

## Notes

- You may need API keys for each LLM provider to use this library.
- Ollama and vLLM must be running on a local or remote server.
- Token usage is an estimate and may vary according to each provider's API response.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2023 

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. 