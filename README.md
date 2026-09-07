# ✉️ AI-Powered Mail Web Application

An intelligent, full-stack email client connected to Google Gmail OAuth 2.0 where an integrated AI Copilot **directly controls and paints the UI programmatically** — composing emails, navigating views, filtering data, and executing contextual actions on behalf of the user through natural language.

---

## 🚀 How to Set It Up and Run It Locally

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

The application comes with comprehensive unit test suites covering AI intent parsing, RFC email parsing, thread grouping, search/filter algorithms, and reactive UI state:

- **Backend Unit Tests (18 Tests)**:
  ```bash
  cd server
  npm test
  ```
- **Frontend Unit Tests (7 Tests)**:
  ```bash
  cd client
  $env:CI="true"; npm test -- --watchAll=false
  ```

---

## 🏗️ Architecture Decisions and Trade-offs Made

### System Architecture Diagram

```mermaid
graph TD
    subgraph Frontend ["Frontend Client (React 18 + Tailwind CSS :3000)"]
        UI["Main Views (Inbox / Sent / EmailDetail)"]
        AP["AI Copilot Side Panel"]
        CTX["EmailContext (State & Active Email Sync)"]
        WS_C["Socket.IO Client Layer"]
    end

    subgraph Backend ["Backend Server (Node.js + Express :5000)"]
        Router["Express API Router"]
        AIService["Multi-Tier AI Parser & Fallback Engine"]
        GmailClient["Google Gmail API Client"]
        Poller["Background Real-Time Sync Worker (15s)"]
        WS_S["Socket.IO Gateway"]
    end

    subgraph External ["Cloud Infrastructure & External APIs"]
        Gmail["Google Gmail OAuth 2.0 & REST API"]
        Mongo[("MongoDB Atlas (Cache & Message Store)")]
        Gemini["Google Gemini 1.5 Flash / Groq / OpenAI"]
    end

    UI --> CTX
    AP -->|Natural Language Intent| Router
    CTX -->|REST Queries / Force Sync| Router
    WS_C <-->|Bi-directional Events ('new-email', 'emails-synced')| WS_S
    Poller -->|Periodically Detects Unsynced Messages| GmailClient
    Poller -->|Saves & Broadcasts| Mongo
    Poller -->|Emits 'new-email'| WS_S
    Router --> AIService
    Router --> GmailClient
    Router --> Mongo
    AIService -->|Zero-Credit Fallback / Free Tier| Gemini
    GmailClient --> Gmail
```

### Key Architectural Decisions & Pragmatic Trade-offs

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
   - *Decision*: The AI Copilot directly manipulates the application's React state and DOM:
     - Natural language commands like *"Compose to alex@techcorp.io with subject 'Meeting'"* visibly pop open the Compose modal and populate the `To`, `Subject`, and `Body` fields.
     - Filter queries like *"Show unread emails from last week"* mutate the inbox filter state and repaint the main message table.
     - Navigation commands like *"Open email from Sarah"* trigger declarative router navigation to `/email/:id`.

5. **Context-Aware Active Email Synchronization**:
   - *Problem*: When reading an email and instructing the assistant to *"Reply to this"*, standard chat widgets lack state awareness of what is currently on screen.
   - *Decision*: We introduced `activeEmail` state management into `EmailContext`. Whenever `/email/:id` is mounted, the active email's sender, subject, body, and thread ID are shared with the AI panel. When the user says *"Reply to this"*, the assistant automatically targets the sender, prepends `Re:`, generates a contextually relevant response, and visibly opens the Compose interface.

---

## 📸 Screenshots & Video Demo: Assistant Controlling the UI

### Dashboard Overview & Glassmorphic Interface
The main dashboard features frosted glassmorphism, gradient identity avatars, unread badges, and an integrated AI Copilot panel:

![Dashboard Overview](docs/screenshots/dashboard-overview.png)

### AI Assistant Driving the UI Programmatically
The assistant executes actions directly on the user's behalf — populating form fields, filtering messages, and rendering interactive action cards:

![AI Copilot Controlling UI](docs/screenshots/ai-copilot-controls-ui.png)

### Walkthrough of Core AI Workflows

| Step | User Command | AI Action & UI Response |
| :---: | :--- | :--- |
| **1** | *"Send an email to alex@techcorp.io with subject 'Q4 Roadmap Sync' and body 'Let's connect at 3 PM today'"* | **Paints & Fills Compose Form**: Visibly launches the Compose modal with recipient, subject, and body pre-filled, presenting an interactive `[ 🚀 Send Now ]` confirmation card. |
| **2** | *"Show unread emails from last week"* | **Filters Main Inbox UI**: Automatically toggles the unread filter and date range, instantly filtering the conversation list in the main viewport. |
| **3** | *"Open the latest email from Sarah"* | **Navigates Views**: Programmatically transitions the route to `/email/:id` and renders the full email conversation and thread timeline. |
| **4** | *"Reply to this"* *(while reading an email)* | **Context-Aware Reply Pre-fill**: Inspects `activeEmail` from the current view, populates recipient (`sarah.c@designsystems.dev`), sets subject (`Re: Design Review`), drafts a tailored response, and opens the editor. |
| **5** | *Incoming Message Detection* | **Real-Time Push**: Automatically receives new incoming messages via Socket.IO and prepends them to the inbox with a toast notification — no manual refresh needed. |

---

## 💡 What You’d Improve With More Time

1. **Google Cloud Pub/Sub Webhook Integration**:
   Configure production Google Cloud Pub/Sub push endpoints with Gmail watch topic subscriptions for instant, sub-second inbox webhook delivery without polling.

2. **Offline-First Storage with IndexedDB**:
   Integrate Dexie.js / IndexedDB to cache drafts, offline outbox queues, and conversation threads locally, allowing full email composing and reading during network disconnects.

3. **Multi-Account Unified Inbox**:
   Support simultaneous authentication for multiple Google accounts and Microsoft Outlook accounts in a unified, switchable inbox feed.

4. **Rich WYSIWYG Editor with Attachments**:
   Upgrade the plain-text compose modal to a rich text editor (e.g. TipTap or Lexical) with markdown shortcuts, inline image embedding, and drag-and-drop file attachments via Gmail MIME multipart APIs.

5. **Voice-Driven Dictation & Commands**:
   Incorporate the Web Speech Recognition API so users can dictate emails and issue hands-free voice commands directly to the AI Copilot.
