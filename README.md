# 🌸 KKOT WebUI

[![GitHub Repository](https://img.shields.io/badge/GitHub-sh2orc%2Fkkot--webui-blue?logo=github)](https://github.com/sh2orc/kkot-webui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
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
- Seamless and Real-time conversational chat UI
- Message copy, like/dislike, and regeneration features
- User message editing capabilities
- Responsive design for mobile and desktop

### ⚙️ Comprehensive Admin Panel
- **General Settings**: User registration, API keys, JWT configuration, OAuth authentication
- **Connection Management**: Multiple API server management for OpenAI and Ollama
- **Model Configuration**: Model selection, token limits, temperature settings
- **MCP Integration**: Model Context Protocol support
- **Evaluation Tools**: Model performance evaluation features
- **Document Management**: Document processing and management
- **Web Search**: Internet search functionality integration
- **Image Generation**: AI image generation API integration
- **Audio Processing**: Speech recognition and TTS settings
- **Pipeline Management**: AI workflow configuration
- **Database Integration**: Database connectivity and management

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
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **Form Management**: React Hook Form + Zod
- **Theme**: next-themes
- **Internationalization**: Custom i18n system
- **State Management**: React Context API

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

- [ ] Real-time streaming response support
- [ ] Conversation history storage and management
- [ ] Plugin system development
- [ ] Extended multi-language support
- [ ] Mobile app development
- [ ] Automatic API documentation generation
- [ ] User authentication system
- [ ] Team collaboration features
- [ ] Advanced model evaluation metrics
- [ ] RAG (Retrieval-Augmented Generation) integration

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