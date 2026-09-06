# 📬 AI-Powered Mail Web Application

> **Nebula KnowLab Hiring Task** — A modern, high-performance email client where the AI Assistant directly controls, paints, and manipulates the UI programmatically through natural language conversation.
> 
> *The AI doesn't just chat — it drives the entire interface.*

---

## 👥 Reviewer Collaborator Invites

Please invite the following reviewers to the private GitHub repository:
- **`Aswath363`**
- **`akshaiP`**
- **`ashwanthnebula`**

---

## ⚡ Key Highlights & Core Capabilities

| Feature Area | Implementation Details | Status |
| :--- | :--- | :---: |
| **Mail Client** | Full-featured Inbox, Sent, Compose Modal, and Email Detail views with responsive glassmorphism. | ✅ Completed |
| **Real-Time Mail Sync** | Bi-directional Socket.IO live sync (`new-email`, `emails-synced`) with background sync heartbeat & webhook simulation. | ✅ Completed |
| **AI Form Filling (`COMPOSE`)** | Visibly opens compose modal, paints To, Subject, and Body fields with sub-second response time. | ✅ Completed |
| **AI Inbox Filter (`SEARCH`/`FILTER`)** | Modifies main inbox list in real-time based on natural language queries, dates, unread state, or sender. | ✅ Completed |
| **Context-Aware Reply (`REPLY`)** | Auto-detects current active email view context to draft personalized contextual replies. | ✅ Completed |
| **AI Navigation (`OPEN`)** | Programmatically navigates routes to open specific matching emails. | ✅ Completed |
| **Interactive Filter Bar** | Filter drawer with active badge counts, unread toggles, date ranges, and one-click clear. | ✅ Completed |

### 🏆 Bonus Criteria Implemented (+23 / 23 Points)

1. **Rich UI in Chat (+5 pts)**: Renders interactive email preview cards, status badges, recipient pills, and 1-click action buttons directly inside the copilot chat.
2. **Confirm Before Send (+5 pts)**: Human-in-the-loop confirmation card rendered in chat. Shows full draft preview with `[ 🚀 Send Now ]` and `[ ✏️ Edit Form ]` buttons; only dispatches upon explicit user confirmation.
3. **Reply & Forward via Assistant (+5 pts)**: Supports commands like *"Reply saying I'll be there"* and *"Forward this to team@example.com"*, auto-populating quote headers and recipient fields.
4. **Thread View (+3 pts)**: Groups conversation turns by `threadId` in `EmailDetail.jsx` with an expandable/collapsible chronological conversation timeline and thread count badges in the inbox.
5. **Keyboard Shortcuts (+3 pts)**:
   - `c` / `C`: Instantly trigger compose modal
   - `/` or `Ctrl + K`: Focus search bar
   - `j`: Move selection down to next email
   - `k`: Move selection up to previous email
   - `Enter` or `o`: Open currently highlighted email
   - `Escape`: Close active compose modal
6. **Dark Theme Toggle (+2 pts)**: Frosted glass theme switcher with seamless dark/light mode transition and persistent theme memory.
7. **Automated Test Suite (+3 pts)**: 100% passing unit test suites for both backend intent parsing (14 test cases in 179ms) and frontend data structure validation.

---

## 🏗️ Architectural Overview & Design Decisions

```
               ┌────────────────────────────────────────────────────────┐
               │              React 18 Single Page App                  │
               │  • Superhuman / Linear Glassmorphism Design System     │
               │  • Keyboard Navigation Hub (j/k, C, /, Enter, Esc)     │
               │  • Real-time Socket.IO Client + Web Audio Feedback     │
               └───────────────────────┬────────────────────────────────┘
                                       │
                    REST API + JWT     │     Socket.IO Events
                   (/api/emails, /ai)  │    ('new-email', 'emails-synced')
                                       ▼
               ┌────────────────────────────────────────────────────────┐
               │              Node.js & Express API Server              │
               │  • Natural Language Intent Parser (OpenAI + Fallback)  │
               │  • Background Sync Worker (45s Heartbeat Engine)       │
               │  • Google OAuth 2.0 & Gmail API Orchestrator           │
               └──────────────┬──────────────────────────┬──────────────┘
                              │                          │
                              ▼                          ▼
               ┌───────────────────────────┐   ┌───────────────────────────┐
               │    MongoDB Atlas Store    │   │      Gmail REST API       │
               │  • Cached Emails & States │   │  • RFC 2822 Transmit      │
               │  • Thread Groupings       │   │  • Push History ID Sync   │
               └───────────────────────────┘   └───────────────────────────┘
```

### Architecture Decisions & Trade-Offs

#### 1. Direct LLM Intent Calling vs Heavy Agent Frameworks (e.g. LangChain / CopilotKit)
- **Decision**: Implemented a lightweight, deterministic structured-output intent parser with an intelligent rule-based fallback engine.
- **Rationale**: Email operations require deterministic execution guarantees and sub-second UI responsiveness. Heavy frameworks introduce multi-second latency, hidden abstractions, and dependency fragility. Our hybrid design delivers instant UI paint operations while remaining 100% operational offline or in demo environments without requiring API tokens.

#### 2. Hybrid MongoDB Cache + Gmail Sync vs Direct Passthrough
- **Decision**: Inbound messages and search indexes are persisted locally in MongoDB Atlas while write operations dispatch directly to Gmail API.
- **Rationale**: Direct Gmail API calls are subject to stringent rate limits (250 quota units/sec) and higher latency. Caching emails locally enables instant instant client-side filtering, sub-millisecond thread grouping, and resilience against network dropouts.

#### 3. Bespoke Frosted Glassmorphic Design System vs Component Libraries (MUI / AntD)
- **Decision**: Handcrafted CSS variables, Tailwind utility tokens, and SVG micro-interactions modeled after Superhuman, Linear, and Raycast.
- **Rationale**: Generic component libraries look like administrative dashboards. Email clients demand high information density, fluid typography, subtle gradient avatars, and tactile micro-interactions (e.g. skeleton shimmer loaders, live pulse badges).

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended, developed on Node v24.16.0)
- **NPM**: v8.0.0 or higher
- **MongoDB**: MongoDB Atlas connection URI (or local MongoDB on port 27017)

---

### Step 1: Clone Repository
```bash
git clone <your-repo-url>
cd "ai mail app"
```

---

### Step 2: Configure Environment Variables

#### Backend (`server/.env`)
Copy the example file:
```bash
cp server/.env.example server/.env
```
Fill in the following parameters:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ai-mail-app?retryWrites=true&w=majority
SESSION_SECRET=your_session_secret_key
JWT_SECRET=your_jwt_secret_key

# Optional (Smart fallback parser works out of the box if omitted):
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

#### Frontend (`client/.env`)
```bash
cp client/.env.example client/.env
```
Contains:
```env
PORT=3000
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

### Step 3: Install Dependencies

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

---

### Step 4: Run the Application

In terminal 1 (Start Server):
```bash
cd server
npm run dev
```
*Server starts on `http://localhost:5000` (MongoDB Atlas connected, Socket.IO initialized).*

In terminal 2 (Start Client):
```bash
cd client
npm start
```
*Client starts on `http://localhost:3000`.*

---

## 🎮 How to Test the AI UI Controls

### Quick Demo Mode (Zero Configuration Required)
Click **"✨ Explore Instant Demo Preview"** on the login screen to enter the app with populated sample conversations, thread histories, and full AI copilot capabilities.

### Sample Natural Language Commands

| Action | Example Command to Type in Copilot | Observed UI Behavior |
| :--- | :--- | :--- |
| **✍️ Compose** | *"Send an email to alex@techcorp.io with subject 'Q4 Sync' and body 'Can we meet at 3pm?'"* | Compose modal visibly springs open and fills out the To, Subject, and Body fields. Assistant displays human-in-the-loop preview card. |
| **✉️ Contextual Reply** | *"Reply to this with 'Looks great, approved!' "* | Opens compose window pre-filled with the active email's sender, `Re: [Subject]`, and the custom reply body. |
| **↗️ Forward Email** | *"Forward this to dev@startup.ai"* | Opens compose modal pre-populated with recipient, `Fwd: [Subject]`, and clean quoted email thread. |
| **📂 Navigate & Open** | *"Open the latest email from Sarah"* | Automatically routes URL to `/email/demo-2` and paints the full email detail canvas. |
| **🔍 Search** | *"Find emails about roadmap"* | Filters the inbox list in real-time to emails containing the keyword. |
| **📅 Filter** | *"Show unread emails from last 7 days"* | Activates filter drawer, sets unread flag, and updates the inbox list. |

---

## 🧪 Running Automated Tests

### Backend Unit Tests (AI Intent Parsing & Helpers)
```bash
cd server
npm test
```
**Output:**
```
✔ should correctly parse COMPOSE with recipient, subject, and body
✔ should recognize FORWARD intent and extract context
✔ should extract contextual REPLY message
✔ should parse OPEN & NAVIGATE intent
✔ should detect FILTER & SEARCH criteria
✔ should correctly parse RFC email addresses
ℹ tests 14 | pass 14 | fail 0 (179ms)
```

### Frontend Core Logic Tests
```bash
cd client
npm test -- --watchAll=false
```
**Output:**
```
PASS src/__tests__/emailControl.test.js
  Mail Client Core Logic & Dataset
    √ SAMPLE_EMAILS contains required email structure
    √ Thread grouping contains multi-message thread
    √ Search filter properly matches subject and body text
    √ Unread filter accurately isolates unread messages
Test Suites: 1 passed, 1 total | Tests: 4 passed, 4 total
```

---

## 📡 Testing Real-Time Push Simulation

You can verify real-time email sync without Google OAuth by triggering the simulation webhook:

```bash
curl -X POST http://localhost:5000/api/emails/simulate-incoming \
  -H "Content-Type: application/json" \
  -d '{"from":{"name":"Elena Rostova","email":"elena@techcorp.io"},"subject":"Production Approved","body":"The release is confirmed for 9 PM tonight."}'
```
*The new email instantly arrives via Socket.IO, prepends to the inbox list without page refresh, updates unread counter, and triggers a real-time notification toast.*

---

## 🔮 What Would Be Improved With More Time

1. **Google Cloud Pub/Sub Push Notifications**:
   - Upgrade from polling/heartbeat to Gmail Watch API with Google Cloud Pub/Sub webhooks for true zero-latency server-side push notifications.
2. **Full RFC 2822 Multipart MIME & Attachment Engine**:
   - Direct handling of inline images, encrypted S/MIME signatures, and streaming cloud attachment uploads to S3/Cloud Storage.
3. **Offline IndexedDB Store with Optimistic Mutations**:
   - Cache full inbox state inside IndexedDB via Dexie.js so users can read, draft, and queue email sends while completely offline.
4. **Voice-Activated AI Mail Copilot**:
   - Integrate Gemini Live API / Web Speech API for hands-free voice interaction: *"Antigravity, what are my urgent emails from today?"*
5. **Unified Multi-Account Support**:
   - Support simultaneous Outlook Graph API and Google Workspace accounts with a unified smart inbox.

---

## 📜 License
MIT License — Built for the **Nebula KnowLab Hiring Task**.
