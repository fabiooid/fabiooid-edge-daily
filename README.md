# Edge Daily

AI-powered daily learning platform delivering beginner-friendly explanations of trending topics in AI, Web3, Fintech, and Energy.

## Overview

Edge Daily automatically generates educational content every weekday at 7:00 AM HKT, rotating through four key tech domains:
- **Monday:** AI
- **Tuesday:** Web3
- **Wednesday:** Fintech
- **Thursday:** Energy

Each post includes:
- Simple 2-3 paragraph explanation
- Real links to source articles for deeper learning
- AI-curated from recent news and developments

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite
- **AI:** Anthropic Claude API with web search
- **Automation:** node-cron for scheduled content generation

## Features

- 📅 Automated daily content generation
- 🔍 Web search integration for trending topics
- 📚 Archive with theme filtering
- 🎨 Clean, Notion-inspired UI
- ⚡ Breadcrumb navigation
- 📱 Responsive design

## Local Development

### Prerequisites
- Node.js v18+
- Anthropic API key

### Setup

1. Clone the repository:
```bash
git clone https://github.com/fabiooid/edge-daily.git
cd edge-daily
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
```

4. Create `.env` file in `server/` directory:
```
PORT=3001
ANTHROPIC_API_KEY=your_api_key_here
```

5. Run the application:

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
npm run dev
```

6. Open http://localhost:5174 in your browser

### Manual Post Generation

To manually generate a post:
```bash
cd server
node generate-post.js
```

## Project Structure
```
edge-daily/
├── src/                    # React frontend
│   ├── components/         # UI components
│   └── App.jsx            # Main app component
├── server/                 # Node.js backend
│   ├── server.js          # Express server
│   ├── database.js        # SQLite database functions
│   ├── scheduler.js       # Cron job scheduler
│   ├── theme-scheduler.js # Theme rotation logic
│   └── generate-post.js   # Manual post generator
└── README.md
```

## Deployment

Frontend: Vercel
Backend: Railway/Render

See deployment docs for detailed instructions.

## Built By

Created by Fabio Vella in Hong Kong, 2026

Powered by Anthropic Claude