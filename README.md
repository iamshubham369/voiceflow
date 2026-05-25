# VoiceFlow AI — Modular Voice Calling Workflow System

VoiceFlow AI is a modular, AI-powered voice calling workflow system. It allows developers and product teams to design, customize, deploy, and audit conversational voice agents in real-time. By combining frontend browser Speech APIs with backend generative Claude models (with built-in keyword fallbacks), Mongoose database call loggers, and Recharts analytics dashboards, VoiceFlow AI provides a complete full-stack environment for voice automation.

---

## 🎙️ Core Features Overview

1. **Analytics Dashboard**: 
   - Real-time summaries tracking Total Calls, Deployed Agents, Average Call Length, and Goal Achievement Rates.
   - Interactive charts built with **Recharts**:
     - *Line Chart*: Daily calling volume counts over the last 7 days.
     - *Pie Chart*: Call distributions segmented by Scenario Type.
     - *Bar Chart*: Comparative metrics checking targets (Total Calls vs. Goals Achieved) per agent.
   - Centralized audits logging the last 10 completed calls with outcome badges.

2. **Agent Creation Console**:
   - Customize agent name, voice type (male, female, neutral), scenario presets, objectives, and system instruction prompts.
   - Staggered templates (Lead Qualification, Appointment Reminder, Feedback Collection, Information Gathering) to auto-populate instructions and goals.
   - Voice synthesis controls adjust speed rate and pitch variables.
   - Edit, delete, or toggle active/inactive states of agent cards directly from the Dashboard.

3. **Call Studio Dialer**:
   - Connect voice dialogue sessions using standard browser Speech-to-Text (`SpeechRecognition`) and Text-to-Speech (`SpeechSynthesis`) APIs.
   - Responsive turn-taking dialogue loop calling the backend response endpoints.
   - Staggered visualizer sound waveforms bouncing actively while speaking or recording.
   - Diagnostic intent badges (e.g. `[Greeting]`, `[Agreement]`, `[Objection]`) mapped beside message bubbles.
   - Goal completion banners indicating when agent objectives are met, automatically disconnecting calls.

4. **Audited Call Logs**:
   - Detailed audits list table displaying call dates, agent names, lengths, and outcome capsules.
   - Search filters and log deletion actions.
   - Modal drawer overlay sheets querying the database to list complete conversational transcripts.

5. **Premium Dark Theme UI**:
   - Built using React (Vite), Tailwind CSS, Framer Motion transitions, and `react-hot-toast` alerts.
   - Responsive Collapsible sidebar hamburger drawer menus tailored for screen widths down to **375px**.

---

## 📁 Project Directory Structure

```bash
/voiceflow
├── .gitignore                         # Excludes node_modules and local environment credentials
├── README.md                          # Project documentation and setup guide
│
├── /voiceflow-backend                 # Node.js + Express Backend
│   ├── /config
│   │   └── db.js                      # Mongoose MongoDB database connector
│   ├── /models
│   │   ├── Agent.js                   # Deployed Agent Schema definition
│   │   └── CallLog.js                 # Call Logs and Transcripts Schema
│   ├── /routes
│   │   ├── agents.js                  # Agent CRUD REST endpoints (POST, GET, PUT, DELETE)
│   │   ├── calls.js                   # Call Log session endpoints (start, message, end, delete)
│   │   ├── analytics.js               # Analytics aggregations endpoint (summary)
│   │   └── conversation.js            # Claude API structured responder endpoint
│   ├── .env.example                   # Environment configuration template
│   ├── .env                           # Local environment config (fallback placeholder)
│   ├── server.js                      # Express server registration and CORS controllers
│   └── package.json                   # Node modules and development nodemon scripts
│
└── /voiceflow-frontend                # React + Vite Frontend
    ├── /src
    │   ├── /components
    │   │   ├── Sidebar.jsx            # Responsive collapsible navigation
    │   │   ├── MicButton.jsx          # Pulse animation toggle controller
    │   │   ├── VoiceWaveform.jsx      # Sound wave visualizer bars
    │   │   └── TranscriptModal.jsx    # Glassmorphic transcript detail overlay
    │   ├── /hooks
    │   │   ├── useSpeechRecognition.js # STT continuous recording hook
    │   │   └── useSpeechSynthesis.js   # TTS synthesis hook
    │   ├── /pages
    │   │   ├── Dashboard.jsx          # Analytics stats and charts
    │   │   ├── AgentCreation.jsx      # Agent deployment form configurations
    │   │   ├── CallStudio.jsx         # Dialer turn-taking workspace
    │   │   └── Logs.jsx               # Audits records listing
    │   ├── App.jsx                    # Navigation routing, global states, and Toasters
    │   ├── main.jsx                   # Entry mounting script
    │   └── index.css                  # Tailwind styles and scrollbar definitions
    ├── tailwind.config.js             # Theme extensions and sound wave keyframes
    ├── postcss.config.js              # PostCSS autoprefixer bindings
    ├── vite.config.js                 # Dev proxies and React presets
    ├── vercel.json                    # SPA routing rewrite rules
    ├── index.html                     # HTML root linking Google Fonts (Outfit, Inter)
    └── package.json                   # React Router, Recharts, Framer Motion packages
```

---

## ⚙️ Local Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v18+ recommended)
- A running [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas) (or local MongoDB server)
- An [Anthropic Claude API Key](https://console.anthropic.com/) (optional, endpoint falls back to keyword processing if missing)

---

### 1. Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd voiceflow-backend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables from template:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and fill in configurations:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/voiceflow?retryWrites=true&w=majority
   ANTHROPIC_API_KEY=your-actual-claude-api-key-here
   FRONTEND_URL=http://localhost:3000
   ```
5. Start development server using nodemon:
   ```bash
   npm run dev
   ```

---

### 2. Frontend Configuration

1. Navigate to the frontend directory:
   ```bash
   cd ../voiceflow-frontend
   ```
2. Install React dependencies:
   ```bash
   npm install
   ```
3. Create a local environment file `.env.local` to direct API routes to localhost:
   ```bash
   echo VITE_API_URL=http://localhost:5000 > .env.local
   ```
4. Start development Vite server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`.

---

## 🚀 Production Deployment Checklist

### Frontend (Vercel)
- Mount repository, select framework: **Vite**
- Build command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: Set to production Render backend URL (e.g. `https://voiceflow-backend.onrender.com`).

### Backend (Render)
- Mount repository, select Environment: **Node**
- Build command: `npm install`
- Start command: `npm start`
- Environment Variables:
  - `MONGODB_URI`: Production MongoDB Atlas connection string.
  - `ANTHROPIC_API_KEY`: Production Claude API key.
  - `PORT`: (Render binds ports automatically, or set `5000`).
  - `FRONTEND_URL`: Set to production Vercel frontend URL (e.g. `https://voiceflow-ai.vercel.app`) to secure CORS origin checks.
