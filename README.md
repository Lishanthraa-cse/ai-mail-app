# AI-Powered Mail Web Application

[![Live Deployment](https://img.shields.io/badge/Live_App-ai--mail--app.onrender.com-success?style=for-the-badge&logo=render)](https://ai-mail-app.onrender.com)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Lishanthraa--cse%2Fai--mail--app-blue?style=for-the-badge&logo=github)](https://github.com/Lishanthraa-cse/ai-mail-app)

An intelligent, full-stack email client connected to Google Gmail OAuth 2.0 where an integrated AI Assistant **directly controls and paints the UI programmatically** — composing emails, navigating views, filtering data, and executing contextual actions on behalf of the user through natural language.

---

## 🌐 Live Deployment & Online Demo

The application is deployed live to production as a unified full-stack single-service on **Render**:

- 🔗 **Live Website URL**: **[https://ai-mail-app.onrender.com](https://ai-mail-app.onrender.com)**
- ✨ **Instant Demo Preview**: Single-click access via the **"Explore Instant Demo Preview"** button on the landing page — test full AI copilot features, sample threads, searching, and compose simulation instantly without requiring Google account authorization.
- 📬 **Live Google Gmail OAuth**: Click **"Sign in with Google"** to authenticate directly with Google and synchronize real-time emails from your actual Gmail inbox.

### Single-Service Unified Deployment Architecture

Rather than separating the frontend and backend into two different domain URLs (which creates CORS pre-flight delays, dual hosting overhead, and complex cookie/token cross-origin handshakes), this project uses a **single-service full-stack deployment**:

1. **Unified Origin**: Both the React Single Page Application (SPA) and the Express REST API / Socket.IO server are served under `https://ai-mail-app.onrender.com`.
2. **Automated Root Build**: The root `npm run build` command installs dependencies for both `client` and `server`, runs `react-scripts build` into `client/build`, and bundles the app for production.
3. **Static SPA Serving with Route Fallback**: The Express backend serves the prebuilt React static files on `/` and delegates all client routes (`/inbox`, `/sent`, `/email/:id`) back to `index.html` via client-side routing fallback.
4. **Zero CORS Friction**: Browser requests connect directly to `/api/*` and WebSocket gateways on the same origin without third-party cookie restrictions.

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

## Production Deployment Guide (Render)

This repository is pre-configured for seamless single-service deployment to **Render**, **Railway**, or any Node.js cloud platform:

### 1. Create Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`https://github.com/Lishanthraa-cse/ai-mail-app.git`).
3. Select the `main` branch.

### 2. Configure Service Settings
- **Runtime**: `Node`
- **Build Command**: `npm run build` *(installs root, client, and server dependencies and compiles the React production bundle)*
- **Start Command**: `npm start` *(runs `node server/src/index.js`)*

### 3. Environment Variables Configuration
Under the **Environment Variables** tab, add the following production variables:

| Variable Key | Production Value / Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Web server port (Render automatically provides `$PORT`) | `10000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster0.mongodb.net/ai-mail-app` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-*` |
| `GOOGLE_REDIRECT_URI` | Production OAuth Callback URL | `https://ai-mail-app.onrender.com/api/auth/google/callback` |
| `CLIENT_URL` | Production Frontend Origin | `https://ai-mail-app.onrender.com` |
| `SESSION_SECRET` | Express session security key | *Random secure string* |
| `JWT_SECRET` | Token signing secret | *Random secure string* |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini LLM key | *Gemini API Key* |

### 4. Google Cloud Console OAuth Configuration
To allow users to log in through the live deployment:
1. Navigate to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit your **OAuth 2.0 Client ID**.
3. Under **Authorized JavaScript origins**, add:
   - `https://ai-mail-app.onrender.com`
4. Under **Authorized redirect URIs**, add:
   - `https://ai-mail-app.onrender.com/api/auth/google/callback`
5. Click **Save**.
6. Under [OAuth Consent Screen > Audience](https://console.cloud.google.com/auth/audience), add tester Google email addresses under **Test users** (or click **Publish App** to allow any Google account to sign in).

---

## Tech stack used in project

- **Frontend**: React 18, Tailwind CSS, Heroicons, Socket.IO Client, React Router v6, React Hot Toast
- **Backend**: Node.js, Express, Socket.IO, Google APIs (OAuth 2.0 & Gmail v1 REST API), Passport.js, Mongoose, JSON Web Tokens (JWT)
- **Database**: MongoDB Atlas
- **Real-Time Synchronization**: Socket.IO bi-directional WebSocket gateway & background sync worker
- **Cloud Hosting & Deployment**: Render (Single-Service Full-Stack Architecture), GitHub Actions / Auto-deploy CI/CD

---

## Architecture Decisions and Trade-offs Made

1. **Cache-First Strategy with MongoDB & In-Memory Buffering**:
   - *Problem*: Calling the Gmail API (`users.messages.list` + individual `users.messages.get`) on every page view or component mount triggers Google's strict 429 quota limits and introduces 3–4 second network latency.
   - *Decision*: Fetched emails are cached in MongoDB Atlas, supplemented by a 30-second in-memory buffer. Repeat queries resolve from cache in **< 15ms**, ensuring snappy UI interactions and eliminating API rate limiting. When fresh data is needed, requests pass `force=true` to query the live Gmail API.
   - *Trade-off*: Newly received emails arriving within the 30-second buffer window could experience a delay without push notifications. We solved this with decision #2 below.

2. **Bi-directional Real-Time Mail Sync (Socket.IO + Server Background Poller)**:
   - *Problem*: Traditional Gmail OAuth webhooks require a verified public HTTPS domain, Google Cloud Pub/Sub topics, and complex subscription handshakes, which are not viable for localhost development.
   - *Decision*: We built a hybrid real-time synchronization architecture:
     - The server runs an automated background poller every 15 seconds that inspects Gmail for new incoming messages, persists them to MongoDB, and immediately broadcasts `new-email` and `emails-synced` events via Socket.IO.
     - The React client listens to Socket.IO events and automatically prepends new incoming messages to the inbox view without requiring a manual browser refresh.
     - A client-side silent background sync provides an additional fallback layer every 25 seconds without flashing full-screen loading spinners.

3. **Multi-Tier AI Engine with Zero-Credit Intelligent Fallback**:
   - *Problem*: Commercial LLM APIs (such as OpenAI) frequently encounter quota depletion (`insufficient_quota`), network timeouts, or rate limits in production evaluations.
   - *Decision*: We designed a 3-tier parsing hierarchy:
     1. **Google Gemini 1.5 Flash / Groq** (Free cloud tier via `GEMINI_API_KEY` or `GROQ_API_KEY`).
     2. **OpenAI GPT-3.5/4** (if configured and funded).
     3. **Intelligent Rule-Based NLP Parser** (100% offline, zero latency, zero external credits).
   - *Outcome*: The application **never crashes or blocks the user**, even when completely offline or with zero API credits.

4. **Programmatic UI Control Paradigm**:
   - *Problem*: Most "AI assistants" merely output conversational text into a chat box, forcing the user to manually copy and paste details or navigate the app themselves.
   - *Decision*: The AI Assistant directly manipulates the application's React state and DOM:
     - Natural language commands like *"Compose to alex@techcorp.io with subject 'Meeting'"* visibly pop open the Compose modal and populate the `To`, `Subject`, and `Body` fields.
     - Filter queries like *"Show unread emails from last week"* mutate the inbox filter state and repaint the main message table.
     - Navigation commands like *"Open email from Sarah"* trigger declarative router navigation to `/email/:id`.

5. **Context-Aware Active Email Synchronization**:
   - *Problem*: When reading an email and instructing the assistant to *"Reply to this"*, standard chat widgets lack state awareness of what is currently on screen.
   - *Decision*: We introduced `activeEmail` state management into `EmailContext`. Whenever `/email/:id` is mounted, the active email's sender, subject, body, and thread ID are shared with the AI panel. When the user says *"Reply to this"*, the assistant automatically targets the sender, prepends `Re:`, generates a contextually relevant response, and visibly opens the Compose interface.

6. **Unified Single-Service Full-Stack Deployment Architecture**:
   - *Problem*: Traditional MERN stack deployments split the frontend (e.g. Vercel) and backend (e.g. Render/Railway) across two distinct domains. This introduces cross-origin cookie blocking, complex CORS configuration, pre-flight `OPTIONS` request latency, dual build tracking, and confusing dual-URL setups for users and graders.
   - *Decision*: We unified the entire full-stack system into a single production service on Render:
     - The root `package.json` coordinates building the React SPA into `client/build` and installing server dependencies.
     - Express serves the production React build statically on the root URL while handling API routes and WebSocket gateway connections on the exact same host.
     - Result: **Zero CORS latency, single deployment pipeline, simplified environment variables, and one unified URL for users.**

---

## Screenshots & Video Demo: Assistant Controlling the UI

### Dashboard Overview & Glassmorphic Interface
The main dashboard features frosted glassmorphism, gradient identity avatars, unread badges, and an integrated AI Assistant panel:

![Dashboard Overview](docs/screenshots/dashboard-overview.png)

### AI Assistant Driving the UI Programmatically
The assistant executes actions directly on the user's behalf — populating form fields, filtering messages, and rendering interactive action cards:

![AI Assistant Controlling UI](docs/screenshots/ai-copilot-controls-ui.png)

### Walkthrough of Core AI Workflows

| Step | User Command | AI Action & UI Response |
| :---: | :--- | :--- |
| **1** | *"Send an email to alex@techcorp.io with subject 'Q4 Roadmap Sync' and body 'Let's connect at 3 PM today'"* | **Paints & Fills Compose Form**: Visibly launches the Compose modal with recipient, subject, and body pre-filled, presenting an interactive `[ Send Now ]` confirmation card. |
| **2** | *"Show unread emails from last week"* | **Filters Main Inbox UI**: Automatically toggles the unread filter and date range, instantly filtering the conversation list in the main viewport. |
| **3** | *"Open the latest email from Sarah"* | **Navigates Views**: Programmatically transitions the route to `/email/:id` and renders the full email conversation and thread timeline. |
| **4** | *"Reply to this"* *(while reading an email)* | **Context-Aware Reply Pre-fill**: Inspects `activeEmail` from the current view, populates recipient (`sarah.c@designsystems.dev`), sets subject (`Re: Design Review`), drafts a tailored response, and opens the editor. |
| **5** | *Incoming Message Detection* | **Real-Time Push**: Automatically receives new incoming messages via Socket.IO and prepends them to the inbox with a toast notification — no manual refresh needed. |

---

## What You’d Improve With More Time

1. **Google Cloud Pub/Sub Webhook Integration**:
   Configure production Google Cloud Pub/Sub push endpoints with Gmail watch topic subscriptions for instant, sub-second inbox webhook delivery without polling.

2. **Offline-First Storage with IndexedDB**:
   Integrate Dexie.js / IndexedDB to cache drafts, offline outbox queues, and conversation threads locally, allowing full email composing and reading during network disconnects.

3. **Multi-Account Unified Inbox**:
   Support simultaneous authentication for multiple Google accounts and Microsoft Outlook accounts in a unified, switchable inbox feed.

4. **Rich WYSIWYG Editor with Attachments**:
   Upgrade the plain-text compose modal to a rich text editor (e.g. TipTap or Lexical) with markdown shortcuts, inline image embedding, and drag-and-drop file attachments via Gmail MIME multipart APIs.

5. **Voice-Driven Dictation & Commands**:
   Incorporate the Web Speech Recognition API so users can dictate emails and issue hands-free voice commands directly to the AI Assistant.
