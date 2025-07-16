# Environment Setup

To use this LLM library, you need to set up environment variables. Create a `.env` file in your project root with the following variables:

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

## Loading Environment Variables

### Node.js

For Node.js applications, you can use the `dotenv` package to load the environment variables:

```bash
npm install dotenv
```

Then in your code:

```javascript
require('dotenv').config();
```

### Next.js

Next.js has built-in support for environment variables. Just create a `.env.local` file in your project root with the variables above.

### React

For React applications, you need to prefix your environment variables with `REACT_APP_`:

```
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
...
```

## Environment Variables in the Library

The library automatically loads environment variables when available. You can also manually configure the library by using the `LLMFactory.create()` method with explicit configuration. 