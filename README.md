# 🌸 KKOT WebUI

[![GitHub Repository](https://img.shields.io/badge/GitHub-sh2orc%2Fkkot--webui-blue?logo=github)](https://github.com/sh2orc/kkot-webui)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-98.2%25-blue)](https://github.com/sh2orc/kkot-webui)

**A Universal Web Interface for Multiple LLM Services**

KKOT WebUI is an open-source project that provides an intuitive and user-friendly web interface for various Large Language Model (LLM) services including OpenAI, Gemini, Ollama, vLLM, and more.

![Screenshot](images/screenshot.png)


> 🔗 **GitHub Repository**: [https://github.com/sh2orc/kkot-webui](https://github.com/sh2orc/kkot-webui)

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with tailwind-merge
- **UI Components**: Radix UI component system
- **Icons**: Lucide React
- **Theme**: next-themes (dark/light mode)
- **Animations**: tailwindcss-animate
- **Notifications**: Sonner toast
- **Forms**: React Hook Form + Zod validation

### Backend & Database
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Drizzle ORM with better-sqlite3
- **Migration**: Automatic migration system
- **Authentication**: NextAuth.js v4 with JWT strategy
- **Password Security**: PBKDF2 hashing
- **Route Protection**: Custom middleware
- **API Management**: OpenAI-compatible API endpoints

### AI & LLM Integration
- **LangChain**: Core, Community, OpenAI, Google GenAI
- **Factory Pattern**: Multi-provider LLM management
- **Supported Providers**: OpenAI, Gemini, Ollama, vLLM
- **Streaming**: Real-time response streaming
- **Multimodal**: Image processing capabilities
- **Deep Research**: Advanced multi-step analysis system with parallel processing
- **Research Engine**: Systematic question decomposition and synthesis capabilities

### State Management & Context
- **State Management**: React Context API with hierarchical provider structure
- **Providers**: BrandingProvider, LanguageProvider, ModelProvider with client-side caching
- **Internationalization**: Custom i18n system (Korean/English) with dynamic module loading
- **Global Layout**: Centralized layout management with route-based rendering
- **Branding Management**: Dynamic app branding with database integration and localStorage persistence

## ✨ Key Features

### 🔐 Authentication & Security
- **NextAuth Integration**: Secure JWT-based authentication system
- **User Management**: Built-in user registration and login system
- **Admin System**: First user automatically becomes admin
- **Route Protection**: Middleware-based route protection for secure access
- **Password Security**: PBKDF2-based password hashing with salt
- **Session Management**: 24-hour session expiry with automatic renewal

### 🤖 Multi-LLM Support
- **OpenAI API**: Support for GPT-4o, GPT-4V (Vision), and other OpenAI models
- **Google Gemini**: Integrated Gemini API support with multimodal capabilities
- **Ollama**: Local Ollama server connectivity with vision model support
- **vLLM**: Support for vLLM inference server
- **Vision Models**: Native support for image analysis and multimodal conversations
- **Factory Pattern**: Unified LLM provider management

### 🔍 Deep Research System
- **Advanced Analysis**: Multi-step systematic research with sub-question generation
- **Intelligent Processing**: Automatic question decomposition and parallel analysis
- **Streaming Interface**: Real-time progress tracking with collapsible step display
- **Synthesis Engine**: Comprehensive finding integration and pattern identification
- **Language Detection**: Automatic language detection with same-language responses
- **Research Planning**: Pre-planned step structure with progress visualization
- **Final Answer Generation**: Structured comprehensive answers with markdown formatting
- **Error Handling**: Robust error handling with graceful fallbacks
- **Parallel Processing**: Concurrent analysis of multiple sub-questions for efficiency
- **Step-by-Step API**: Modular API endpoints for each research phase
- **Progress Visualization**: Interactive UI with status badges and animated indicators

### 💬 Chat Interface
- **Real-time Streaming**: Seamless streaming response for natural conversations with abort functionality
- **Multimodal Support**: Image upload and processing with drag & drop functionality
- **Interactive Features**: Message copy, like/dislike, and regeneration capabilities with visual feedback
- **Message Management**: User message editing and conversation history with enhanced UX
- **Message Rating**: Built-in rating system allowing users to like or dislike AI responses for feedback collection
- **Auto Title Generation**: AI-powered automatic chat session title generation
- **Page Transitions**: Smooth page transitions using View Transitions API
- **Loading States**: Enhanced loading indicators and state management with skeleton UI
- **Responsive Design**: Optimized for mobile and desktop experiences with dynamic padding
- **Anti-Duplicate**: Intelligent duplicate message prevention and submission controls
- **Performance Optimization**: Memoized components with React.memo for optimal re-rendering
- **Scroll Optimization**: Smooth scrolling with content-visibility and CSS containment
- **Memory Management**: Efficient handling of long conversations with virtual scrolling techniques
- **Deep Research Integration**: Seamless integration with advanced research capabilities for complex queries

### 🤖 Agent Management
- **Custom AI Agents**: Create and manage personalized AI agents with specific configurations
- **Agent Profiles**: Upload custom images and descriptions for each agent
- **Model Integration**: Connect agents to different LLM models and providers
- **Parameter Control**: Fine-tune temperature, maxTokens limits, and other model parameters
- **Feature Flags**: Configure agents with specific capabilities like Deep Research and Web Search
- **Multimodal Support**: Configure agents for image processing capabilities
- **Token Management**: Configurable maxTokens settings for response length control

### ⚙️ Comprehensive Admin Panel
- **General Settings**: User registration, API keys, JWT configuration, OAuth authentication
- **Connection Management**: Multiple API server management for OpenAI, Gemini, Ollama, vLLM
- **Model Configuration**: Model selection, token limits, temperature settings, multimodal capabilities
- **Agent Management**: Create, edit, and delete custom AI agents with image upload
- **API Management**: OpenAI-compatible API endpoints with rate limiting and usage tracking
- **MCP Integration**: Model Context Protocol support
- **Evaluation Tools**: Model performance evaluation features
- **Document Management**: Document processing and management
- **Web Search**: Internet search functionality integration (SearchXNG, Google, Bing)
- **Image Generation**: AI image generation API integration (OpenAI, Stability AI)
- **Audio Processing**: Speech recognition and TTS settings (OpenAI, ElevenLabs)
- **Pipeline Management**: AI workflow configuration
- **Database Management**: Database connectivity and schema management

### 🗄️ Database & Backend Architecture
- **Multi-Database Support**: SQLite for development, PostgreSQL for production
- **Schema Management**: Automatic migrations with version control
- **Repository Pattern**: Clean data access layer with transaction support
- **API Management**: RESTful API design with OpenAI compatibility
- **Rate Limiting**: Configurable rate limiting for API endpoints
- **Usage Tracking**: Comprehensive API usage analytics and monitoring
- **Data Persistence**: Chat history, agent configurations, and settings storage

### 🌐 API Management System
- **OpenAI Compatibility**: Full OpenAI API compatibility for seamless integration
- **API Key Management**: Secure API key generation and validation
- **Rate Limiting**: Configurable rate limits per API key
- **Usage Analytics**: Detailed tracking of API usage and performance
- **CORS Configuration**: Flexible CORS settings for web applications
- **Authentication Options**: Optional authentication for API endpoints

### 🎨 Modern UI/UX
- **Clean Design**: Modern interface built with Tailwind CSS and Radix UI components
- **Theme Support**: Dark/Light theme switching with system preference detection
- **Smooth Transitions**: Page transitions using View Transitions API for seamless navigation
- **Loading States**: Enhanced loading indicators and skeleton UI for better user experience
- **Responsive Design**: Mobile-first approach with adaptive layouts and collapsible sidebar
- **Performance Optimized**: Memoized components and efficient rendering strategies
- **Dynamic Branding**: Customizable app name, logo, and favicon with real-time updates
- **Intuitive Navigation**: Context-aware navigation with route-based layout switching
- **Drag & Drop**: File upload interface with visual feedback and validation
- **Global Layout System**: Centralized layout management with route-based rendering

### 🌐 API Management System
- **OpenAI Compatibility**: Full OpenAI API compatibility for seamless integration
- **API Key Management**: Secure API key generation and validation
- **Rate Limiting**: Configurable rate limits per API key
- **Usage Analytics**: Detailed tracking of API usage and performance
- **CORS Configuration**: Flexible CORS settings for web applications
- **Authentication Options**: Optional authentication for API endpoints

### 🌐 Internationalization
- Multi-language support (Korean, English)
- Easy language switching
- Extensible translation system
- Server-side translation utilities for improved performance
- Dynamic module loading with caching

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- npm, yarn, or pnpm

### Installation & Setup

1. **Clone the repository**
```bash
git clone https://github.com/sh2orc/kkot-webui.git
cd kkot-webui
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Environment Setup**
Create a `.env.local` file in the root directory:
```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Database Configuration (Optional - defaults to SQLite)
DB_TYPE=sqlite
DATABASE_URL=file:./kkot.db

# LLM API Keys (Optional)
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key
```

4. **Database Migration**
```bash
npm run db:migrate
```

5. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. **Open in browser**
Visit http://localhost:3000 to access the application.

7. **First User Setup**
The first user to register will automatically become an admin with full access to all features.

### Production Build

```bash
npm run build
npm run start
```

## 🏗️ Database Schema

### Core Tables

#### Users
- **Purpose**: User management and authentication
- **Key Fields**: id, username, email, password (hashed), role, timestamps
- **Relationships**: One-to-many with chat sessions

#### Chat Sessions
- **Purpose**: Chat conversation management
- **Key Fields**: id, userId, title, timestamps
- **Relationships**: Many-to-one with users, one-to-many with messages

#### Chat Messages
- **Purpose**: Individual message storage
- **Key Fields**: id, sessionId, role, content, contentType, attachments
- **Relationships**: Many-to-one with chat sessions

### LLM Management Tables

#### LLM Servers
- **Purpose**: LLM server configuration
- **Key Fields**: id, provider, name, baseUrl, apiKey, models, enabled, settings
- **Relationships**: One-to-many with LLM models

#### LLM Models
- **Purpose**: Model configuration and capabilities
- **Key Fields**: id, serverId, modelId, provider, capabilities, contextLength, supportsMultimodal
- **Relationships**: Many-to-one with LLM servers, one-to-many with agents

#### Agent Management
- **Purpose**: AI agent configuration
- **Key Fields**: id, agentId, modelId, name, systemPrompt, parameters, imageData
- **Relationships**: Many-to-one with LLM models

### API Management Tables

#### API Management
- **Purpose**: Global API service configuration
- **Key Fields**: id, apiEnabled, corsEnabled, rateLimitEnabled, openaiCompatible

#### API Keys
- **Purpose**: API key management for external access
- **Key Fields**: id, name, keyHash, permissions, rateLimitTier, usage limits

#### API Usage
- **Purpose**: API usage tracking and analytics
- **Key Fields**: id, apiKeyId, endpoint, method, statusCode, tokensUsed, responseTime

## 📁 Project Structure

```
kkot-webui/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── chat/              # Chat interface
│   ├── admin/             # Admin panel
│   │   ├── general/       # General settings
│   │   ├── connection/    # API connections
│   │   ├── model/         # Model management
│   │   ├── agent/         # Agent management
│   │   ├── api/           # API management
│   │   ├── mcp/           # MCP integration
│   │   ├── evaluation/    # Model evaluation
│   │   ├── documents/     # Document management
│   │   ├── websearch/     # Web search settings
│   │   ├── image/         # Image generation
│   │   ├── audio/         # Audio processing
│   │   ├── pipeline/      # AI pipelines
│   │   └── database/      # Database settings
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth API routes
│   │   ├── agents/        # Agent management API
│   │   ├── api-management/ # API management API
│   │   ├── llm-servers/   # LLM server management API
│   │   ├── llm-models/    # LLM model management API
│   │   ├── chat/          # Chat API with streaming
│   │   ├── deepresearch/  # Deep Research API endpoints
│   │   │   ├── query-analysis/     # Initial query analysis
│   │   │   ├── subquestions/       # Sub-question generation
│   │   │   ├── subquestion-analysis/ # Individual sub-question analysis
│   │   │   ├── synthesis/          # Analysis synthesis
│   │   │   └── final-answer/       # Final answer generation
│   │   └── profile/       # User profile API
│   ├── book/              # Content pages
│   ├── setting/           # User settings
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── admin/             # Admin components
│   ├── chat/              # Chat-related components
│   │   ├── deep-research-display.tsx # Deep Research UI component
│   ├── layout/            # Layout components
│   ├── sidebar/           # Sidebar components
│   ├── contents/          # Page content components
│   ├── providers/         # Context providers
│   └── ui/                # Reusable UI components
├── lib/                   # Utility functions
│   ├── auth.ts            # Authentication utilities
│   ├── db/                # Database configuration
│   │   ├── schema.ts      # Database schema definitions
│   │   ├── repository.ts  # Repository pattern implementation
│   │   ├── migrations/    # Migration files
│   │   └── server.ts      # Server-side database utilities
│   ├── llm/               # LLM integration
│   │   ├── factory.ts     # LLM factory pattern
│   │   ├── base.ts        # Base LLM class
│   │   ├── openai.ts      # OpenAI integration
│   │   ├── gemini.ts      # Gemini integration
│   │   ├── ollama.ts      # Ollama integration
│   │   ├── vllm.ts        # vLLM integration
│   │   └── deepresearch.ts # Deep Research processing logic
│   ├── i18n.ts            # Client-side internationalization
│   └── i18n-server.ts     # Server-side internationalization
├── i18n/                  # Translation files
│   ├── eng/               # English translations
│   └── kor/               # Korean translations
├── hooks/                 # Custom React hooks
├── middleware.ts          # Route protection middleware
├── scripts/               # Utility scripts
│   └── migrate.ts         # Database migration script
└── types/                 # TypeScript type definitions
```

## 🔧 Development

### Database Operations

```bash
# Run migrations
npm run db:migrate

# Reset database (development only)
npm run db:reset

# Generate migration
npm run db:generate
```

### API Development

The project includes OpenAI-compatible API endpoints:

```bash
# Chat completions (OpenAI compatible)
POST /api/v1/chat/completions

# List models
GET /api/v1/models

# API key management
POST /api/v1/api-keys
GET /api/v1/api-keys
DELETE /api/v1/api-keys/{id}
```

### Environment Variables

```bash
# Database
DB_TYPE=sqlite|postgresql
DATABASE_URL=your-database-url

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# LLM API Keys
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key
```

## 🛡️ Security Features

- **Authentication**: NextAuth.js with JWT strategy
- **Password Security**: PBKDF2 hashing with salt
- **Route Protection**: Middleware-based authentication
- **Session Management**: Secure session handling
- **API Security**: API key validation and rate limiting
- **Admin Access**: Role-based access control
- **CORS Configuration**: Flexible CORS settings
- **SQL Injection Prevention**: Drizzle ORM protection

## 🚀 Performance Optimizations

- **Code Splitting**: Dynamic imports for better performance
- **Image Optimization**: Next.js Image component
- **Caching**: Translation and component caching
- **Streaming**: Real-time response streaming
- **Database Indexing**: Optimized database queries
- **Memoization**: React component memoization

## 📖 API Documentation

### OpenAI Compatible Endpoints

#### Chat Completions
```bash
POST /api/v1/chat/completions
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
```

#### List Models
```bash
GET /api/v1/models
Authorization: Bearer your-api-key
```

### Internal API Endpoints

#### Agent Management
```bash
# Create agent
POST /api/agents
# Update agent
PUT /api/agents/{id}
# Delete agent
DELETE /api/agents/{id}
# List agents
GET /api/agents
```

#### Deep Research API
```bash
# Full deep research (streaming)
POST /api/deepresearch
# Generate sub-questions
POST /api/deepresearch/subquestions
# Initial query analysis
POST /api/deepresearch/query-analysis
# Analyze sub-question
POST /api/deepresearch/subquestion-analysis
# Synthesis analysis
POST /api/deepresearch/synthesis
# Generate final answer
POST /api/deepresearch/final-answer
```

#### Chat Management
```bash
# Create chat session
POST /api/chat
# Get chat messages
GET /api/chat/{id}
# Update chat title
PUT /api/chat/{id}/title
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub Repository**: [https://github.com/sh2orc/kkot-webui](https://github.com/sh2orc/kkot-webui)
- **Documentation**: [Coming Soon]
- **Issues**: [https://github.com/sh2orc/kkot-webui/issues](https://github.com/sh2orc/kkot-webui/issues)

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/sh2orc/kkot-webui/issues) page
2. Create a new issue if your problem isn't already reported
3. Provide detailed information about your environment and the issue

---

Made with ❤️ by the KKOT WebUI team 