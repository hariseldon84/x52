# TaskQuest

A gamified productivity platform that combines task management with game mechanics to make productivity fun and engaging.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8.9.0+
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the required environment variables
4. Start the development server:
   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
.
├── apps/
│   ├── web/          # Next.js web application
│   └── mobile/       # React Native mobile app (coming soon)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── config/       # Shared configurations
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utility functions
├── scripts/          # Development and build scripts
└── docs/             # Project documentation
```

## 🛠 Development

- `pnpm dev` - Start development servers
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Lint all files
- `pnpm format` - Format all files with Prettier

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
