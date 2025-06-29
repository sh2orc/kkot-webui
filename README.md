# 🌸 KKOT WebUI

[![GitHub Repository](https://img.shields.io/badge/GitHub-sh2orc%2Fkkot--webui-blue?logo=github)](https://github.com/sh2orc/kkot-webui)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-98.2%25-blue)](https://github.com/sh2orc/kkot-webui)

**A Universal Web Interface for Multiple LLM Services**

KKOT WebUI is an open-source project that provides an intuitive and user-friendly web interface for various Large Language Model (LLM) services including OpenAI, Gemini, Ollama, vLLM, and more.

> 🔗 **GitHub Repository**: [https://github.com/sh2orc/kkot-webui](https://github.com/sh2orc/kkot-webui)

## ✨ Key Features

### 🤖 Multi-LLM Support
- **OpenAI API**: Support for GPT-4o and other OpenAI models
- **Google Gemini**: Integrated Gemini API support
- **Ollama**: Local Ollama server connectivity
- **Other Models**: Support for Claude, LLaMA, Mistral, and various other models

### 💬 Chat Interface
- **Real-time Streaming**: Seamless streaming response for natural conversations
- **Interactive Features**: Message copy, like/dislike, and regeneration capabilities
- **Message Management**: User message editing and conversation history
- **Responsive Design**: Optimized for mobile and desktop experiences

### 🤖 Agent Management
- **Custom AI Agents**: Create and manage personalized AI agents with specific configurations
- **Agent Profiles**: Upload custom images and descriptions for each agent
- **Model Integration**: Connect agents to different LLM models and providers
- **Parameter Control**: Fine-tune temperature, token limits, and other model parameters

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
- Intuitive navigation and user experience

### 🌐 Internationalization
- Multi-language support (Korean, English)
- Easy language switching
- Extensible translation system

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

3. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. **Open in browser**
Visit http://localhost:3000 to access the application.

### Production Build

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
kkot-webui/
├── app/                    # Next.js App Router
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
│   ├── book/              # Content pages
│   ├── setting/           # User settings
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── chat/              # Chat-related components
│   ├── layout/            # Layout components
│   ├── sidebar/           # Sidebar components
│   ├── contents/          # Page content components
│   ├── admin/             # Admin components
│   ├── providers/         # Context providers
│   └── ui/                # Reusable UI components
├── i18n/                  # Internationalization
│   ├── eng/               # English translations
│   └── kor/               # Korean translations
├── lib/                   # Utility functions
├── hooks/                 # Custom React hooks
├── styles/                # Style files
└── public/                # Static assets
```

## 🔧 Tech Stack

- **Framework**: Next.js 15.2.4
- **Language**: TypeScript
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Form Management**: React Hook Form + Zod
- **Validation**: Zod schema validation
- **Theme**: next-themes
- **Internationalization**: Custom i18n system
- **State Management**: React Context API
- **File Handling**: Multipart form data support

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
- [x] **Real-time streaming response support** - Implemented streaming chat API
- [x] **Conversation history storage and management** - Chat sessions with persistent storage
- [x] **Extended multi-language support** - Korean/English support with i18n system
- [x] **Agent management system** - Create, edit, and manage custom AI agents
- [x] **Model provider integration** - Unified interface for multiple LLM providers
- [x] **Database integration** - SQLite/PostgreSQL support with migrations
- [x] **Admin panel enhancements** - Comprehensive settings and management interface

### 🚧 In Progress / Planned
- [ ] Plugin system development
- [ ] Mobile app development
- [ ] Automatic API documentation generation
- [ ] User authentication system
- [ ] Team collaboration features
- [ ] Advanced model evaluation metrics
- [ ] RAG (Retrieval-Augmented Generation) integration
- [ ] Voice input/output support
- [ ] Advanced prompt templates
- [ ] API rate limiting and usage analytics

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