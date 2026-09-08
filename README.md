# AI-Powered Mail Web Application

[![Live Deployment](https://img.shields.io/badge/Live_App-ai--mail--app.onrender.com-success?style=for-the-badge&logo=render)](https://ai-mail-app.onrender.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Lishanthraa--cse%2Fai--mail--app-blue?style=for-the-badge&logo=github)](https://github.com/Lishanthraa-cse/ai-mail-app)

An intelligent, full-stack email client connected to Google Gmail OAuth 2.0 where an integrated AI Assistant **directly controls and paints the UI programmatically** — composing emails, navigating views, filtering data, and executing contextual actions on behalf of the user through natural language.

---

## 🌐 Live Deployment & Online Demo

The app is live on **Render** as a unified full-stack service:

- 🔗 **Live URL**: **[https://ai-mail-app.onrender.com](https://ai-mail-app.onrender.com)**
- ✨ **Instant Demo**: Click "Explore Instant Demo Preview" — test AI features without Google login
- 📬 **Gmail OAuth**: Sign in with Google to sync your real inbox

### Architecture: Single-Service Deployment

Frontend (React SPA) and Backend (Express API + Socket.IO) are served from the same origin:

- **Unified URL**: Both API and static files under `https://ai-mail-app.onrender.com`
- **Zero CORS**: No cross-origin requests, no pre-flight latency, no cookie issues
- **Root Build**: `npm run build` compiles React into `client/build`, Express serves it
- **SPA Fallback**: All client routes (`/inbox`, `/email/:id`) route to `index.html`

---

## How to Set It Up and Run It Locally

### 1. Prerequisites
Ensure you have the following installed on your development machine:
- **Node.js**: v18.x or higher
- **npm**: v8.x or higher
- **MongoDB**: MongoDB Atlas database (or local MongoDB running on `mongodb://localhost:27017`)
- **Google Cloud Console Account**: For Gmail OAuth 2.0 Client ID & Client Secret (with `https://mail.google.com/` scope enabled)

---

### 2. Clone the Repository
```bash
git clone https://github.com/Lishanthraa-cse/ai-mail-app.git
cd ai-mail-app
```

---

### 3. Backend Setup & Configuration

1. Navigate to the `server` directory and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file inside the `server/` directory:
   ```bash
   # In server/.env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/ai-mail-app?retryWrites=true&w=majority
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
   SESSION_SECRET=your_express_session_secret_key_123
   JWT_SECRET=your_jwt_signing_secret_key_456

   # AI Provider (Optional: The app includes a built-in intelligent offline rule engine if omitted)
   GEMINI_API_KEY=your_google_gemini_api_key
   # or GROQ_API_KEY=your_groq_api_key
   # or OPENAI_API_KEY=your_openai_api_key
   ```

---

### 4. Frontend Setup & Configuration

1. Open a new terminal, navigate to the `client` directory, and install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Create a `.env` file inside the `client/` directory (optional, defaults to port 5000):
   ```bash
   # In client/.env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

---

### 5. Running the Application

Run the backend and frontend concurrently in two separate terminal windows:

**Terminal 1 (Backend API Server & WebSocket Gateway):**
```bash
cd server
npm run dev
```
> The server boots on **http://localhost:5000** and connects to MongoDB with automatic SRV DNS resolution.

**Terminal 2 (Frontend React Client):**
```bash
cd client
npm start
```
> The React client compiles and launches on **http://localhost:3000**.

Visit **[http://localhost:3000](http://localhost:3000)** in your browser and log in with your Google account to authorize Gmail access.

---

### 6. Running Automated Tests

- **Backend Unit Tests**:
  ```bash
  cd server
  npm test
  ```
- **Frontend Unit Tests**:
  ```bash
  cd client
  npm test -- --watchAll=false
  ```

---

## Production Deployment

The application is live at **[https://ai-mail-app.onrender.com](https://ai-mail-app.onrender.com)**.

### 1. Deployment Configuration

For deploying your own instance on Render, Railway, or similar platforms:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Runtime**: Node.js

### 2. Required Environment Variables

| Variable | Description |
|:---------|:------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL (e.g., `https://your-domain.com/api/auth/google/callback`) |
| `SESSION_SECRET` | Express session secret |
| `JWT_SECRET` | JWT signing secret |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key |

### 3. Google OAuth Setup

Add your production domain to:
- **Authorized JavaScript origins**: `https://your-domain.com`
- **Authorized redirect URIs**: `https://your-domain.com/api/auth/google/callback`

> **Note**: For testing, add your email as a Test User in Google Cloud Console > OAuth Consent Screen.

---

## Tech stack used in project

- **Frontend**: React 18, Tailwind CSS, Heroicons, Socket.IO Client, React Router v6, React Hot Toast
- **Backend**: Node.js, Express, Socket.IO, Google APIs (OAuth 2.0 & Gmail v1 REST API), Passport.js, Mongoose, JSON Web Tokens (JWT)
- **Database**: MongoDB Atlas
- **Real-Time Synchronization**: Socket.IO bi-directional WebSocket gateway & background sync worker
- **Cloud Hosting & Deployment**: Render (Single-Service Full-Stack Architecture), GitHub Actions / Auto-deploy CI/CD

---

## Architecture Decisions & Trade-offs

### 1. Cache-First Strategy
- **Problem**: Gmail API calls trigger rate limits (429) and 3-4s latency on every page load.
- **Solution**: Cache emails in MongoDB + 30s in-memory buffer. Repeat queries resolve in **<15ms**.
- **Trade-off**: 30s delay for new emails → solved with real-time sync (#2).

### 2. Real-Time Sync (Socket.IO + Background Poller)
- **Problem**: Gmail webhooks require verified HTTPS domains + Pub/Sub setup, not viable for local dev.
- **Solution**: Server polls Gmail every 15s, persists new emails, broadcasts via Socket.IO. Client prepends new emails instantly without refresh.
- **Fallback**: Client-side silent sync every 25s as backup.

### 3. Multi-Tier AI Engine (Zero-Credit Fallback)
- **Problem**: LLM APIs frequently hit quota limits or timeout.
- **Solution**: 3-tier hierarchy:
  1. Gemini / Groq (free tier)
  2. OpenAI GPT (if funded)
  3. **Rule-based NLP parser** (offline, zero latency, zero cost)
- **Outcome**: App never crashes, even offline.

### 4. Programmatic UI Control
- **Problem**: Most AI assistants just output text, forcing manual copy-paste.
- **Solution**: AI directly manipulates React state & DOM:
  - `"Compose to alex@..."` → opens & fills compose modal
  - `"Show unread emails"` → filters inbox
  - `"Open email from Sarah"` → navigates to `/email/:id`

### 5. Context-Aware Active Email
- **Problem**: "Reply to this" needs to know which email is open.
- **Solution**: `activeEmail` state in EmailContext. Assistant auto-targets sender, prepends `Re:`, drafts response, opens compose.

### 6. Unified Single-Service Deployment
- **Problem**: Split frontend/backend deployments cause CORS issues, dual domains, cookie blocking.
- **Solution**: Express serves React static files + API + WebSocket on same origin.
- **Result**: Zero CORS, single deployment, one unified URL.

---

## Screenshots & Demo

### Dashboard Overview
Glassmorphic UI with gradient avatars, unread badges, and integrated AI Assistant panel:

![Dashboard Overview](docs/screenshots/dashboard-overview.png)

### AI Assistant in Action
Programmatically controlling the UI — filling forms, filtering emails, and rendering action cards:

![AI Assistant Controlling UI](docs/screenshots/ai-copilot-controls-ui.png)

### Live Demo Video
[![AI Mail App Demo](docs/screenshots/dashboard-overview.png)](docs/Deployed%20live%20demo.mp4)

*Click the thumbnail above to watch the full walkthrough*

---

### Core AI Workflows

| Command | AI Action |
|:--------|:----------|
| *"Send email to alex@techcorp.io subject 'Q4 Roadmap Sync' body 'Let's connect at 3 PM'"* | Opens compose modal → pre-fills recipient, subject, body → shows `[Send Now]` button |
| *"Show unread emails from last week"* | Toggles unread filter + date range → instantly filters inbox |
| *"Open latest email from Sarah"* | Navigates to `/email/:id` → renders full conversation |
| *"Reply to this"* (while reading) | Detects `activeEmail` → auto-fills recipient + `Re:` subject → drafts tailored response |
| *(Incoming email)* | Socket.IO pushes new email → prepends to inbox + toast notification |

---

## Future Improvements

| Area | Enhancement |
|:-----|:------------|
| **Instant Delivery** | Replace polling with Google Cloud Pub/Sub webhooks |
| **Offline Support** | Cache drafts & emails locally using IndexedDB |
| **Multi-Account** | Support multiple Google + Outlook accounts in unified inbox |
| **Rich Composer** | Upgrade to TipTap/Lexical with markdown, images, attachments |
| **Voice Control** | Web Speech API for dictation & hands-free commands |
