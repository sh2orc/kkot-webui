# 🌸 KKOT WebUI

[![GitHub Repository](https://img.shields.io/badge/GitHub-sh2orc%2Fkkot--webui-blue?logo=github)](https://github.com/sh2orc/kkot-webui)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-98.2%25-blue)](https://github.com/sh2orc/kkot-webui)

**A Universal Web Interface for Multiple LLM Services**

KKOT WebUI is an open-source project that provides an intuitive and user-friendly web interface for various Large Language Model (LLM) services including OpenAI, Gemini, Ollama, vLLM, and more.

> 🔗 **GitHub Repository**: [https://github.com/sh2orc/kkot-webui](https://github.com/sh2orc/kkot-webui)

## ✨ Key Features

### 🔐 Authentication & Security
- **NextAuth Integration**: Secure JWT-based authentication system
- **User Management**: Built-in user registration and login system
- **Admin System**: First user automatically becomes admin
- **Route Protection**: Middleware-based route protection for secure access
- **Password Security**: Bcrypt-based password hashing with salt

### 🤖 Multi-LLM Support
- **OpenAI API**: Support for GPT-4o, GPT-4V (Vision), and other OpenAI models
- **Google Gemini**: Integrated Gemini API support with multimodal capabilities
- **Ollama**: Local Ollama server connectivity with vision model support
- **Vision Models**: Native support for image analysis and multimodal conversations
- **Other Models**: Support for Claude, LLaMA, Mistral, and various other models

### 💬 Chat Interface
- **Real-time Streaming**: Seamless streaming response for natural conversations with abort functionality
- **Multimodal Support**: Image upload and processing with drag & drop functionality
- **Interactive Features**: Message copy, like/dislike, and regeneration capabilities with visual feedback
- **Message Management**: User message editing and conversation history with enhanced UX
- **Auto Title Generation**: AI-powered automatic chat session title generation
- **Page Transitions**: Smooth page transitions using View Transitions API
- **Loading States**: Enhanced loading indicators and state management with skeleton UI
- **Responsive Design**: Optimized for mobile and desktop experiences with dynamic padding
- **Anti-Duplicate**: Intelligent duplicate message prevention and submission controls
- **Performance Optimization**: Memoized components and efficient scroll management
- **Vision Models**: Support for GPT-4V and other vision-capable models

### 🤖 Agent Management
- **Custom AI Agents**: Create and manage personalized AI agents with specific configurations
- **Agent Profiles**: Upload custom images and descriptions for each agent
- **Model Integration**: Connect agents to different LLM models and providers
- **Parameter Control**: Fine-tune temperature, maxTokens limits, and other model parameters
- **Token Management**: Configurable maxTokens settings for response length control

### ⚙️ Comprehensive Admin Panel
- **General Settings**: User registration, API keys, JWT configuration, OAuth authentication
- **Connection Management**: Multiple API server management for OpenAI and Ollama
- **Model Configuration**: Model selection, token limits, temperature settings
- **Agent Management**: Create, edit, and delete custom AI agents
- **MCP Integration**: Model Context Protocol support
- **Evaluation Tools**: Model performance evaluation features
- **Document Management**: Document processing and management
- **Web Search**: Internet search functionality integration
- **Image Generation**: AI image generation API integration
- **Audio Processing**: Speech recognition and TTS settings
- **Pipeline Management**: AI workflow configuration
- **Database Integration**: Database connectivity and management

### 🗄️ Database & Storage
- **SQLite Integration**: Local database with automatic migrations
- **PostgreSQL Support**: Production-ready database configuration
- **Data Persistence**: Chat history, agent configurations, and settings storage
- **Migration System**: Automated database schema updates

### 🎨 Modern UI/UX
- Clean design based on Tailwind CSS
- Radix UI components utilization
- Dark/Light theme support
- Smooth page transitions with View Transitions API
- Enhanced loading states and animations with skeleton UI
- Intuitive navigation and user experience
- Drag & drop file upload interface
- Dynamic responsive design with mobile-first approach
- Performance-optimized rendering with memoization

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

## 📁 Project Structure

```
kkot-webui/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── chat/              # Chat pages
│   ├── admin/             # Admin settings
│   │   ├── general/       # General settings
│   │   ├── connection/    # API connections
│   │   ├── model/         # Model configuration
│   │   ├── mcp/           # MCP integration
│   │   ├── evaluation/    # Model evaluation
│   │   ├── tools/         # Tools management
│   │   ├── documents/     # Document management
│   │   ├── websearch/     # Web search settings
│   │   ├── image/         # Image generation
│   │   ├── audio/         # Audio processing
│   │   ├── pipeline/      # AI pipelines
│   │   └── database/      # Database settings
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth API routes
│   │   ├── agents/        # Agent management API
│   │   ├── chat/          # Chat API with title generation
│   │   └── profile/       # User profile API
│   ├── book/              # Content pages
│   ├── setting/           # User settings
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── chat/              # Chat-related components
│   ├── layout/            # Layout components
│   ├── sidebar/           # Sidebar components
│   ├── contents/          # Page content components
│   ├── admin/             # Admin components
│   ├── providers/         # Context providers (including page transitions)
│   └── ui/                # Reusable UI components (loading, transitions)
├── i18n/                  # Internationalization
│   ├── eng/               # English translations
│   └── kor/               # Korean translations
├── lib/                   # Utility functions
│   ├── auth.ts            # Authentication utilities
│   ├── db/                # Database configuration
│   ├── llm/               # LLM integration with maxTokens support
│   ├── i18n.ts            # Client-side internationalization
│   └── i18n-server.ts     # Server-side internationalization utilities
├── hooks/                 # Custom React hooks
├── middleware.ts          # Route protection middleware
├── types/                 # TypeScript type definitions
├── styles/                # Style files
└── public/                # Static assets
```

## 🔧 Tech Stack

- **Framework**: Next.js 15.2.4
- **Language**: TypeScript
- **Authentication**: NextAuth.js v4 with JWT strategy
- **Database**: SQLite with Drizzle ORM (PostgreSQL support)
- **Password Security**: bcryptjs with PBKDF2 hashing
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Form Management**: React Hook Form + Zod
- **Validation**: Zod schema validation
- **Theme**: next-themes
- **Internationalization**: Custom i18n system
- **State Management**: React Context API
- **File Handling**: Multipart form data support
- **Route Protection**: Custom middleware for authentication

## 🆕 Latest Features

### 🖼️ Multimodal Chat Support
- **Image Upload**: Drag & drop image upload with preview functionality
- **Vision Model Integration**: Support for GPT-4V, Gemini Vision, and other vision models
- **Image Processing**: Automatic image compression and format optimization
- **Multimodal Messages**: Seamless text and image combination in conversations
- **File Type Validation**: Comprehensive file type and size validation
- **Mobile Camera Support**: Direct camera capture on mobile devices

### ⚡ Performance Optimization
- **Memoized Components**: React.memo optimization for message rendering
- **Efficient Scrolling**: Smart scroll management with dynamic padding
- **Streaming Optimization**: Enhanced streaming response handling
- **Skeleton Loading**: Improved loading states with realistic skeleton UI
- **Memory Management**: Optimized memory usage for large conversations
- **Render Optimization**: Conditional rendering to prevent unnecessary updates

### 🎬 Page Transitions
- **View Transitions API**: Smooth page transitions using modern web standards
- **Fallback Support**: Graceful degradation for browsers without View Transitions API
- **Scroll Position Memory**: Maintains scroll position across page transitions
- **Custom Transition Components**: TransitionLink component for seamless navigation

### 🔢 Token Management
- **maxTokens Configuration**: Fine-grained control over response length
- **Per-Agent Settings**: Individual token limits for each AI agent
- **Dynamic Token Control**: Runtime adjustment of token limits in chat sessions
- **Example Usage**: Comprehensive examples for different token scenarios

### 🏷️ Auto Title Generation
- **AI-Powered Titles**: Automatic generation of meaningful chat session titles
- **Multi-language Support**: Titles generated in the same language as the conversation
- **Smart Fallbacks**: Intelligent fallback mechanisms for title generation
- **Length Optimization**: Automatically optimized title lengths for UI display

### 📱 Mobile Experience
- **Responsive Design**: Optimized for mobile and tablet devices
- **Touch Interactions**: Enhanced touch gestures and interactions
- **Dynamic Padding**: Adaptive padding based on screen size and content
- **Mobile-First Approach**: Designed with mobile users in mind
- **Keyboard Handling**: Improved virtual keyboard support

### 🌐 Server-side Internationalization
- **Server-only Utilities**: Dedicated server-side translation functions
- **Module Caching**: Efficient caching of translation modules
- **Preloading Support**: Ability to preload translation modules for better performance
- **Error Handling**: Robust error handling with fallback mechanisms

### 🎨 UI/UX Improvements
- **Chat Layout**: Dedicated layout for chat pages with optimized navigation
- **Loading Animations**: Smooth loading animations throughout the application
- **Enhanced Accessibility**: Improved accessibility features and ARIA labels
- **Visual Feedback**: Better visual feedback for user interactions
- **Error States**: Comprehensive error handling with user-friendly messages

## 🌟 Contributing

This project is completely open source and welcomes contributions from everyone. Your contributions help us add more features faster!

### How to Contribute

1. Fork this repository
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### Contributing Guidelines

- Maintain consistent code style
- Write tests for new features
- Update documentation
- Check for existing issues to avoid duplicates

## 🎯 Roadmap

### ✅ Completed Features
- [x] **User authentication system** - NextAuth-based secure login/registration
- [x] **Real-time streaming response support** - Implemented streaming chat API
- [x] **Conversation history storage and management** - Chat sessions with persistent storage
- [x] **Extended multi-language support** - Korean/English support with i18n system
- [x] **Agent management system** - Create, edit, and manage custom AI agents
- [x] **Model provider integration** - Unified interface for multiple LLM providers
- [x] **Database integration** - SQLite/PostgreSQL support with migrations
- [x] **Admin panel enhancements** - Comprehensive settings and management interface
- [x] **Route protection** - Middleware-based authentication and authorization
- [x] **Page transitions** - View Transitions API with smooth animations
- [x] **Token management** - maxTokens configuration for response control
- [x] **Auto title generation** - AI-powered chat session titles
- [x] **Enhanced loading states** - Unified loading components and states
- [x] **Server-side i18n** - Performance-optimized translation utilities
- [x] **Multimodal chat support** - Image upload and vision model integration
- [x] **Performance optimization** - Memoized components and efficient rendering
- [x] **Mobile experience** - Responsive design with mobile-first approach
- [x] **Streaming optimization** - Enhanced streaming with abort functionality

### 🚧 In Progress / Planned
- [ ] Plugin system development
- [ ] Mobile app development (PWA)
- [ ] Automatic API documentation generation
- [ ] Team collaboration features
- [ ] OAuth provider integration (Google, GitHub)
- [ ] Advanced model evaluation metrics
- [ ] RAG (Retrieval-Augmented Generation) integration
- [ ] Voice input/output support
- [ ] Advanced prompt templates
- [ ] API rate limiting and usage analytics
- [ ] File attachment support (PDF, DOC, etc.)
- [ ] Advanced image editing tools
- [ ] Conversation export/import functionality
- [ ] Real-time collaboration features

## 📄 License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## 🤝 Support & Contact

- **Issue Reports**: [GitHub Issues](https://github.com/sh2orc/kkot-webui/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/sh2orc/kkot-webui/discussions)
- **Email**: sh2orc@gmail.com

## 🙏 Acknowledgments

We sincerely thank all contributors who help improve this project. Your contributions make AI benefits accessible to more people around the world.

---

**Make AI conversations easier and more enjoyable with KKOT WebUI!** 🚀 