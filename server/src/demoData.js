// 50 Realistic Demo Conversations for Instant Demo Preview Mode
const DEMO_EMAILS = [
  {
    "emailId": "demo-1",
    "threadId": "thread-q4-ai-roadmap",
    "threadCount": 2,
    "from": {
      "name": "Alice Walker",
      "email": "alice.walker@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Quarterly AI Roadmap & Sprint Priorities",
    "snippet": "Hey team, I finalized the Q4 AI sprint priorities. Direct LLM function calling and sub-second UI paint are on track.",
    "body": "Hey team,\n\nI finalized the draft for our upcoming Q4 AI agent rollout. Please take a look before our engineering sync tomorrow at 10 AM.\n\nKey highlights:\n- Direct LLM function calling for inbox actions\n- Sub-second UI paint response\n- Automated draft generation and summary\n- Privacy guardrails and isolated demo testing\n\nLooking forward to everyone's feedback!\n\nBest,\nAlice Walker\nVP of Product, TechCorp",
    "date": "2026-09-08T02:35:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX",
      "IMPORTANT"
    ]
  },
  {
    "emailId": "demo-1-reply",
    "threadId": "thread-q4-ai-roadmap",
    "threadCount": 2,
    "from": {
      "name": "Elena Rostova",
      "email": "elena@techcorp.io"
    },
    "to": [
      {
        "name": "Alice Walker",
        "email": "alice.walker@techcorp.io"
      },
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Re: Quarterly AI Roadmap & Sprint Priorities",
    "snippet": "I reviewed the sprint priorities. Elena here — direct LLM actions and telemetry benchmarks look solid.",
    "body": "Hi Alice,\n\nI reviewed the sprint priorities. Direct LLM actions and telemetry benchmarks look solid.\n\nI will prepare the P95 latency graphs ahead of our sync tomorrow.\n\nBest,\nElena Rostova\nLead AI Architect",
    "date": "2026-09-08T02:50:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-2",
    "threadId": "thread-k8s-cluster-upgrade",
    "threadCount": 1,
    "from": {
      "name": "Jack Miller",
      "email": "jack.miller@cloudops.net"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Production Kubernetes Cluster Maintenance Notice (v1.30)",
    "snippet": "Scheduled rolling maintenance on us-east-1 worker nodes will commence at 02:00 UTC this Saturday. Zero downtime expected.",
    "body": "Hi team,\n\nOur scheduled maintenance window for updating the EKS production cluster to Kubernetes v1.30 is set for this Saturday, 02:00 UTC.\n\nAll pods have proper PodDisruptionBudgets configured, so we anticipate zero downtime for user traffic. We will monitor ingress latency and error rates throughout the rolling upgrade.\n\nLet me know if you foresee any conflicts with ongoing deployment pipelines.\n\nRegards,\nJack Miller\nLead Site Reliability Engineer",
    "date": "2026-09-08T02:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-3",
    "threadId": "thread-board-meeting-prep",
    "threadCount": 3,
    "from": {
      "name": "John Davis",
      "email": "john.davis@ventures.co"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Q3 Board Deck & ARR Growth Highlights",
    "snippet": "Great job surpassing our Net Revenue Retention target this quarter. I have reviewed the board slides and left three comments.",
    "body": "Hi everyone,\n\nCongratulations on an exceptional third quarter! The 142% Net Revenue Retention and reduction in customer acquisition costs will be the centerpiece of our board presentation.\n\nI added three inline notes to slide 8 (CAC payback period) and slide 14 (Enterprise pipeline expansion). Let's do a 20-minute dry run on Thursday afternoon.\n\nBest regards,\nJohn Davis\nPartner, Horizon Ventures",
    "date": "2026-09-08T01:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "IMPORTANT"
    ]
  },
  {
    "emailId": "demo-4",
    "threadId": "thread-glassmorphic-design",
    "threadCount": 2,
    "from": {
      "name": "Sarah Chen",
      "email": "sarah.c@designsystems.dev"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Design System Review: Frosted Glass & Dark Mode Tokens",
    "snippet": "The new frosted glass components and micro-interactions look incredible! Avatars and action cards contrast nicely.",
    "body": "Hi everyone,\n\nThe new frosted glass components and micro-interactions look incredible! Loved the vibrant gradient avatars and instant AI replies.\n\nThe typography contrasts nicely against both light and dark themes, and all buttons pass accessibility guidelines.\n\nLet me know when the final build is deployed to staging so our UX team can run usability tests.\n\nCheers,\nSarah Chen\nDesign Lead",
    "date": "2026-09-07T23:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-5",
    "threadId": "thread-llm-latency-benchmark",
    "threadCount": 1,
    "from": {
      "name": "Elena Rostova",
      "email": "elena@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "AI Latency Benchmarks: Gemini 1.5 Flash vs Rule-Based Fallback",
    "snippet": "P95 latency dropped from 920ms to 240ms after enabling prompt caching and token streaming.",
    "body": "Hello team,\n\nHere are the telemetry benchmarks from our latest stress test:\n\n- P50 Response Time: 180ms\n- P95 Response Time: 240ms (down from 920ms)\n- Zero-credit rule parser fallback: 12ms execution\n- Command recognition accuracy: 99.2%\n\nThe fallback intent parser performed flawlessly during our simulated network disconnect test.\n\nBest,\nElena Rostova\nLead AI Architect",
    "date": "2026-09-07T21:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-6",
    "threadId": "thread-stripe-billing-september",
    "threadCount": 1,
    "from": {
      "name": "Stripe Billing",
      "email": "invoices@stripe.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Invoice #INV-2026-0908 for AI Mail Workspace Pro",
    "snippet": "Your invoice for the period Sep 1 – Sep 30 is ready. The amount of $49.00 has been charged to your default card.",
    "body": "Hello,\n\nYour monthly subscription for AI Mail Workspace Pro has renewed. The amount of $49.00 has been charged successfully.\n\nInvoice Summary:\n- AI Copilot Unlimited Actions: $39.00\n- High-Speed Real-time Sync Gateway: $10.00\n- Status: Paid\n\nYou can download the complete PDF receipt from your billing dashboard.\n\nThank you for choosing AI Mail!\nStripe Payments Team",
    "date": "2026-09-07T19:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "FINANCE"
    ]
  },
  {
    "emailId": "demo-7",
    "threadId": "thread-security-audit-report",
    "threadCount": 1,
    "from": {
      "name": "Michael Chang",
      "email": "m.chang@securityaudit.org"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "SOC2 Type II Annual Penetration Test Results - Grade A",
    "snippet": "Zero high or critical severity vulnerabilities detected. OAuth token isolation and CSRF mitigations passed all criteria.",
    "body": "Hi Security Team,\n\nWe have completed the annual external penetration testing for the AI Mail web platform. The assessment yielded an overall Grade A rating.\n\nKey Highlights:\n- OAuth 2.0 PKCE implementation: Compliant\n- Strict Content-Security-Policy & CORS controls: Passed\n- JWT token rotation & storage hygiene: No findings\n\nThe full 42-page executive summary is attached in the portal.\n\nWarm regards,\nMichael Chang, CISSP\nPrincipal Security Consultant",
    "date": "2026-09-07T15:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "SECURITY"
    ]
  },
  {
    "emailId": "demo-8",
    "threadId": "thread-fintech-payouts",
    "threadCount": 2,
    "from": {
      "name": "David Kim",
      "email": "david.kim@fintech.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "ACH Transfer Batch #8842 Settled Successfully",
    "snippet": "The batch payment reconciliation for European partner accounts has been verified by Citibank.",
    "body": "Hi Team,\n\nJust confirming that ACH Batch #8842 ($184,250.00) cleared the Federal Reserve settlement window today at 11:30 AM EST.\n\nAll ledger accounts have been balanced and automated reconciliation hooks fired without discrepancies.\n\nThanks,\nDavid Kim\nHead of Treasury Operations",
    "date": "2026-09-07T11:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "FINANCE"
    ]
  },
  {
    "emailId": "demo-9",
    "threadId": "thread-legal-terms-update",
    "threadCount": 1,
    "from": {
      "name": "Emily Watson",
      "email": "emily.watson@legalcounsel.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Updated Privacy Policy & Terms of Service for Google OAuth Compliance",
    "snippet": "Drafted the OAuth data handling clauses required by Google Verification guidelines. Please review section 4.",
    "body": "Hi Team,\n\nI have revised our external Privacy Policy to ensure complete alignment with Google API Limited Use disclosure requirements.\n\nSection 4 explicitly states:\n- User Gmail data is never used for training third-party generalized AI models\n- Tokens are stored using AES-256 encryption\n- Users may revoke access and request data deletion at any time\n\nThis will expedite our external production approval process.\n\nBest,\nEmily Watson, Esq.",
    "date": "2026-09-07T07:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX",
      "LEGAL"
    ]
  },
  {
    "emailId": "demo-10",
    "threadId": "thread-github-pr-merged",
    "threadCount": 1,
    "from": {
      "name": "GitHub Notifications",
      "email": "notifications@github.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "[ai-mail-app] Pull Request #42 Merged: \"Add Instant Demo Preview Isolation\"",
    "snippet": "Lishanthraa-cse merged commit 90dcae1 into main. All automated unit tests and linting passed.",
    "body": "Lishanthraa-cse merged 1 commit into main from branch feat/instant-demo-isolation.\n\nChanges:\n+ 50 realistic demo email conversations\n+ Isolated preview session without database leakage\n+ Client-side keyboard shortcuts (C to compose, / to search)\n\nView pull request on GitHub: https://github.com/Lishanthraa-cse/ai-mail-app/pull/42",
    "date": "2026-09-07T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-11",
    "threadId": "thread-coffee-catchup",
    "threadCount": 2,
    "from": {
      "name": "Alice Walker",
      "email": "alice.walker@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Coffee catch-up before the quarterly all-hands?",
    "snippet": "Are you around for a quick 15-minute coffee at the 3rd floor lounge tomorrow around 9:30 AM?",
    "body": "Hey! Are you around for a quick 15-minute coffee at the 3rd floor lounge tomorrow around 9:30 AM before the big quarterly all-hands? Would love to brainstorm a few thoughts on the upcoming product demo.\n\nLet me know if that time works for you!\n\nCheers,\nAlice",
    "date": "2026-09-07T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-12",
    "threadId": "thread-incident-postmortem",
    "threadCount": 1,
    "from": {
      "name": "Jack Miller",
      "email": "jack.miller@cloudops.net"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Postmortem: Redis Connection Pool Exhaustion on Sep 04",
    "snippet": "Root cause identified: unclosed pub/sub client listener during WebSocket reconnections. Mitigations deployed.",
    "body": "Team,\n\nThe root cause analysis for the 4-minute API degradation on Sep 4th is now complete.\n\nSummary:\n- Cause: Connection pool exhaustion caused by dangling WebSocket clients\n- Fix: Enabled TCP keep-alive and automated pool recycling\n- Prevention: Added Datadog alert for open Redis handles > 500\n\nNo user data or messages were delayed or lost.\n\nJack",
    "date": "2026-09-06T15:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-13",
    "threadId": "thread-customer-interview-notes",
    "threadCount": 1,
    "from": {
      "name": "Jessica Taylor",
      "email": "jessica.t@marketingpro.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Customer Feedback Summary: 5 Enterprise Pilot Accounts",
    "snippet": "Customers highlighted the natural language email search and automated draft replies as their #1 favorite features.",
    "body": "Hi Product Team,\n\nWe wrapped up 5 comprehensive feedback sessions with beta enterprise customers this week. The response has been overwhelmingly positive.\n\nKey Quotes:\n- \"The assistant actually filling the compose modal for me saved 10+ minutes per day.\"\n- \"Search by natural intent is significantly faster than standard Gmail search operators.\"\n\nFull recording links are attached in Notion.\n\nJessica",
    "date": "2026-09-06T03:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-14",
    "threadId": "thread-cloud-security-alert",
    "threadCount": 1,
    "from": {
      "name": "Google Cloud Security",
      "email": "no-reply@accounts.google.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Security Notice: New OAuth Client Authorized",
    "snippet": "AI Mail Assistant was granted access to Gmail API scopes from IP 192.0.2.1.",
    "body": "Hi User,\n\nYour Google account was recently authorized for use with \"AI Mail Assistant\" on Render.\n\nRequested scopes:\n- https://mail.google.com/ (Full mailbox access)\n- https://www.googleapis.com/auth/userinfo.email\n\nIf you initiated this authorization, you can safely disregard this message.\n\nGoogle Cloud Security Team",
    "date": "2026-09-06T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "SECURITY"
    ]
  },
  {
    "emailId": "demo-15",
    "threadId": "thread-seed-round-followup",
    "threadCount": 2,
    "from": {
      "name": "John Davis",
      "email": "john.davis@ventures.co"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Introductions to Fintech Enterprise Partners",
    "snippet": "I introduced you to Marcus Vance, Head of Strategic Integrations at Enterprise Partners. Check your calendar for an invite.",
    "body": "Hi,\n\nAs promised during our sync, I connected you via email to Marcus Vance at Enterprise Partners. They are looking to equip their 3,000 corporate relationship managers with AI-assisted email workflows.\n\nHe will be in San Francisco next Tuesday if an in-person meeting makes sense.\n\nBest,\nJohn",
    "date": "2026-09-05T15:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "IMPORTANT"
    ]
  },
  {
    "emailId": "demo-16",
    "threadId": "thread-figma-design-handoff",
    "threadCount": 1,
    "from": {
      "name": "Sarah Chen",
      "email": "sarah.c@designsystems.dev"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Figma Handoff: Email Thread Accordion & Command Palette (Cmd+K)",
    "snippet": "Shared the final Auto-layout specs and micro-animation prototypes for the Cmd+K quick action palette.",
    "body": "Hey,\n\nI updated the Figma file with the specs for the Command Palette (Cmd+K / Ctrl+K). It includes:\n- Real-time fuzzy search\n- Quick-action shortcuts (Mark Read, Star, Archive)\n- Subtle glassmorphic blur with 12px border radius\n\nTake a look when you have a moment!\n\nSarah",
    "date": "2026-09-05T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-17",
    "threadId": "thread-ai-model-benchmark-results",
    "threadCount": 1,
    "from": {
      "name": "Brian Murphy",
      "email": "brian@innovatelabs.ai"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Research Paper: Fast Context Extraction in Email Thread Graphs",
    "snippet": "Sharing our preprint on sub-100ms thread summarization using attention distillation.",
    "body": "Hi,\n\nThought you might find our latest lab paper relevant to your work on AI Mail. We demonstrate a graph-attention technique that extracts key decision points from 20+ email threads in under 80 milliseconds.\n\nPDF link: https://arxiv.org/abs/2609.00421\n\nWould love to discuss potential applications.\n\nBest regards,\nDr. Brian Murphy",
    "date": "2026-09-05T03:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-18",
    "threadId": "thread-slack-weekly-digest",
    "threadCount": 1,
    "from": {
      "name": "Slack Daily Digest",
      "email": "digest@slack.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Weekly Highlights in #engineering-announcements",
    "snippet": "38 unread messages across 4 channels. 12 mentions in #deployments.",
    "body": "Here is what happened in your Slack workspace this week:\n\n- #deployments: 14 successful production builds\n- #ai-feedback: 6 new positive testimonials\n- #general: Quarterly town hall schedule posted\n\nOpen Slack to jump directly to conversations.",
    "date": "2026-09-04T15:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-19",
    "threadId": "thread-aws-monthly-billing",
    "threadCount": 1,
    "from": {
      "name": "Amazon Web Services",
      "email": "no-reply@amazon.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Amazon Web Services Invoice #AWS-991204 - Paid",
    "snippet": "Your AWS billing statement for August 2026 is available. Total amount: $142.18.",
    "body": "Dear Customer,\n\nThank you for using Amazon Web Services. Your payment of $142.18 for Account 8920-1192-3341 was successfully charged.\n\nServices utilized:\n- Amazon Route 53 (Global DNS resolution)\n- Amazon Simple Email Service (SES Fallback)\n- Amazon CloudFront (CDN caching)\n\nAccess the AWS Management Console to download your tax invoice.",
    "date": "2026-09-04T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "FINANCE"
    ]
  },
  {
    "emailId": "demo-20",
    "threadId": "thread-enterprise-intro-marcus",
    "threadCount": 2,
    "from": {
      "name": "Marcus Vance",
      "email": "marcus.v@enterprisepartners.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Introduction via John Davis / Enterprise AI Mail Pilot",
    "snippet": "John Davis spoke highly of your AI Mail solution. We are evaluating mailbox productivity tools for Q1.",
    "body": "Hi,\n\nJohn Davis suggested we connect regarding your AI-powered email assistant. We are currently testing several productivity tools to help our client directors manage high-volume deal flow communications.\n\nAre you available for a 30-minute demonstration next Tuesday at 2:00 PM PST?\n\nLooking forward to speaking,\nMarcus Vance\nManaging Director, Enterprise Partners",
    "date": "2026-09-03T15:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX",
      "IMPORTANT"
    ]
  },
  {
    "emailId": "demo-21",
    "threadId": "thread-quarterly-okrs-alice",
    "threadCount": 1,
    "from": {
      "name": "Alice Walker",
      "email": "alice.walker@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Finalized Q4 OKRs for Product & Engineering",
    "snippet": "Objective 1: Achieve sub-second AI action latency across all client platforms. Objective 2: Scale to 50k active users.",
    "body": "Team,\n\nPlease review our approved OKRs for the upcoming quarter:\n\nObjective 1: Sub-second AI action response\n- KR 1: P95 AI command execution < 250ms\n- KR 2: 99.5% intent classification accuracy\n\nObjective 2: Frictionless User Experience\n- KR 1: 1-click Instant Demo preview with zero registration barrier\n- KR 2: Streamlined Google OAuth verification approval\n\nAlice Walker",
    "date": "2026-09-03T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-22",
    "threadId": "thread-devops-weekly-newsletter",
    "threadCount": 1,
    "from": {
      "name": "Tom Bradley",
      "email": "tom.bradley@devopsdaily.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "DevOps Weekly #412: Zero-Downtime Container Deployments",
    "snippet": "This week: Mastering health check probes in Render, lightweight Alpine node containers, and Socket.IO load balancing.",
    "body": "Welcome to issue #412 of DevOps Weekly!\n\nFeatured articles:\n1. Why single-service deployments save 40% in cloud network ingress bills\n2. Optimizing React build assets with Brotli compression\n3. Setting up graceful shutdown handlers in Express 4\n\nRead the full edition online at devopsdaily.io/412",
    "date": "2026-09-03T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-23",
    "threadId": "thread-contract-amendment-david",
    "threadCount": 1,
    "from": {
      "name": "David Kim",
      "email": "david.kim@fintech.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Signed Service Level Agreement (SLA) Amendment",
    "snippet": "Attached is the executed 99.95% uptime SLA agreement counter-signed by our CFO.",
    "body": "Hi,\n\nOur legal and finance departments have countersigned the 99.95% availability SLA addendum.\n\nThe agreed escalation tiers and monthly rebate credits are now officially active.\n\nThanks for your partnership,\nDavid Kim",
    "date": "2026-09-02T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "FINANCE"
    ]
  },
  {
    "emailId": "demo-24",
    "threadId": "thread-frontend-performance-audit",
    "threadCount": 1,
    "from": {
      "name": "Rachel Green",
      "email": "rachel@designhub.studio"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Lighthouse Score: 98/100 on Mobile & Desktop",
    "snippet": "All Core Web Vitals are green: LCP 0.8s, FID 12ms, CLS 0.01. Great work on bundle tree-shaking.",
    "body": "Hi Engineers,\n\nJust ran our monthly synthetic Lighthouse audit on the web client.\n\nScores:\n- Performance: 98\n- Accessibility: 100\n- Best Practices: 100\n- SEO: 100\n\nThe lazy-loading of the AI panel and SVG icon optimization had a major impact.\n\nRachel",
    "date": "2026-09-02T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-25",
    "threadId": "thread-hiring-pipeline-update",
    "threadCount": 1,
    "from": {
      "name": "Sophia Martinez",
      "email": "sophia.m@cloudscale.net"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Engineering Candidates for Senior Full-Stack Role",
    "snippet": "Sent over 3 vetted candidate profiles with strong React, Node, and LLM orchestration experience.",
    "body": "Hi,\n\nWe screened 14 applicants this week and shortlisted 3 standout engineers for the Full-Stack AI Engineer role.\n\nAll three candidates completed our practical coding exercise and have extensive experience building real-time collaboration apps.\n\nLet me know your availability for final round interviews.\n\nBest,\nSophia",
    "date": "2026-09-01T03:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-26",
    "threadId": "thread-ai-summarizer-feedback",
    "threadCount": 1,
    "from": {
      "name": "Liam O'Connor",
      "email": "liam@analyticsgroup.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Feedback: \"Summarize this email\" saved our analysts 2 hours today",
    "snippet": "The 3-bullet executive summary feature is a game changer for long regulatory compliance threads.",
    "body": "Hey team,\n\nJust wanted to send a quick note of appreciation. Our analysts deal with 10-page legal disclosures daily, and your \"Summarize this email\" action accurately captured all critical deadline items.\n\nKeep up the great innovation!\n\nLiam O'Connor",
    "date": "2026-08-31T15:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-27",
    "threadId": "thread-database-index-optimization",
    "threadCount": 1,
    "from": {
      "name": "Jack Miller",
      "email": "jack.miller@cloudops.net"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "MongoDB Atlas Compound Index Performance Update",
    "snippet": "Added compound index on { userId: 1, date: -1, isRead: 1 }. Query latency reduced by 78%.",
    "body": "Team,\n\nI created the recommended compound indexes on the emails collection in Atlas:\n- { userId: 1, date: -1 }\n- { userId: 1, labels: 1 }\n\nExplain plans show 100% IXSCAN operations with index execution time under 4ms.\n\nJack",
    "date": "2026-08-31T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-28",
    "threadId": "thread-growth-metrics-august",
    "threadCount": 1,
    "from": {
      "name": "Olivia Bennett",
      "email": "olivia@growthmarketing.co"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "August Monthly Growth Report: +34% Organic Signups",
    "snippet": "Landing page conversion rate jumped from 4.2% to 7.8% following the launch of the Instant Demo button.",
    "body": "Hi all,\n\nThe data is in for August:\n- Total unique visitors: 42,800\n- Instant Demo plays: 6,400\n- Google OAuth conversions: 1,920\n- Day-7 Retention: 61%\n\nThe frictionless preview experience is directly driving our top-of-funnel momentum.\n\nOlivia",
    "date": "2026-08-30T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-29",
    "threadId": "thread-quantum-computing-summit",
    "threadCount": 1,
    "from": {
      "name": "Daniel Harris",
      "email": "dharris@quantumcomputing.tech"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Keynote Speaker Invitation: Applied AI & Intelligent Mail Systems",
    "snippet": "We would be honored to host you as a panelist at our annual Applied Intelligence Summit in November.",
    "body": "Dear Colleague,\n\nOn behalf of the Applied Intelligence Steering Committee, I invite you to join our panel discussion on \"Human-Agent Collaboration in Everyday Software\".\n\nYour work demonstrating programmatic UI manipulation via AI commands would be of immense interest to our 800+ attendees.\n\nSincerely,\nDaniel Harris\nConference Chair",
    "date": "2026-08-29T15:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-30",
    "threadId": "thread-paris-office-expansion",
    "threadCount": 1,
    "from": {
      "name": "Chloe Dupont",
      "email": "chloe.dupont@financehub.fr"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Re: Paris Tech Hub Lease Agreement Finalization",
    "snippet": "The notarized lease for the Paris 8th arrondissement office has been registered with local authorities.",
    "body": "Bonjour,\n\nWe have completed the signing for our European engineering annex. Keys and access badges will be issued on October 1st.\n\nPlease find the countersigned bilingual lease attached.\n\nCordialement,\nChloe Dupont",
    "date": "2026-08-29T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "FINANCE"
    ]
  },
  {
    "emailId": "demo-31",
    "threadId": "thread-design-token-audit",
    "threadCount": 1,
    "from": {
      "name": "Sarah Chen",
      "email": "sarah.c@designsystems.dev"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Color Contrast Audit: WCAG 2.1 AAA Compliance Achieved",
    "snippet": "All button hover states and muted timestamp labels now meet the 7:1 contrast ratio requirement.",
    "body": "Hi team,\n\nFollowing our accessibility sprint, all 42 color tokens in both light and dark modes now exceed WCAG AAA standards.\n\nScreen readers also properly announce incoming unread badges and search result count updates.\n\nSarah",
    "date": "2026-08-28T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-32",
    "threadId": "thread-grace-hopper-nomination",
    "threadCount": 1,
    "from": {
      "name": "Grace Hopper Community",
      "email": "newsletter@hopperawards.org"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Call for Nominations: 2026 AI Innovation in User Interface",
    "snippet": "Nominations are open for innovative products transforming accessibility and assistive UI workflows.",
    "body": "Dear Community Member,\n\nEach year we recognize engineering teams who build software that democratizes technology through intelligent assistive interfaces.\n\nNominations close September 30. Self-nominations and community nominations are both welcomed.\n\nWarm regards,\nThe Hopper Awards Committee",
    "date": "2026-08-27T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-33",
    "threadId": "thread-q3-tax-filing-notice",
    "threadCount": 1,
    "from": {
      "name": "David Kim",
      "email": "david.kim@fintech.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Quarterly Corporate Estimated Tax Voucher #1120-W",
    "snippet": "Electronic filing confirmation for Delaware franchise and federal quarterly estimated taxes.",
    "body": "Team,\n\nThe Q3 estimated tax vouchers have been transmitted through the EFTPS network.\n\nConfirmation ID: EFTPS-2026-993810\nAmount: $24,500.00\n\nAll tax filings are up to date and in full compliance.\n\nDavid",
    "date": "2026-08-26T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "FINANCE"
    ]
  },
  {
    "emailId": "demo-34",
    "threadId": "thread-security-patch-advisory",
    "threadCount": 1,
    "from": {
      "name": "Michael Chang",
      "email": "m.chang@securityaudit.org"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Security Advisory: Routine Dependency Bump for Express & Axios",
    "snippet": "Recommend bumping Axios to 1.7.4 to incorporate the latest HTTP header parsing patches.",
    "body": "Hi Engineering,\n\nOur automated weekly scanner noted minor patch updates for two project dependencies:\n- Axios 1.7.4\n- React-router-dom 6.26.1\n\nNo active exploits target our current configuration, but applying patch bumps is recommended for security posture maintenance.\n\nMichael",
    "date": "2026-08-25T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "SECURITY"
    ]
  },
  {
    "emailId": "demo-35",
    "threadId": "thread-board-observer-rights",
    "threadCount": 1,
    "from": {
      "name": "John Davis",
      "email": "john.davis@ventures.co"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Series A Term Sheet Drafting Progress",
    "snippet": "Counsel is finalizing the term sheet language. Valuation multiple aligned with market top-quartile.",
    "body": "Hi,\n\nJust got off the phone with our legal partners. The draft term sheet for our upcoming Series A lead position will be in your inbox by Friday.\n\nThe proposed structure reflects your strong product-market fit and capital efficiency.\n\nBest,\nJohn",
    "date": "2026-08-24T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "IMPORTANT"
    ]
  },
  {
    "emailId": "demo-36",
    "threadId": "thread-cdn-edge-cache-purge",
    "threadCount": 1,
    "from": {
      "name": "Jack Miller",
      "email": "jack.miller@cloudops.net"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Automated Cache Purge Webhook Configured for Deployments",
    "snippet": "Static JavaScript and CSS chunks are now purged at edge locations automatically on every main push.",
    "body": "Hi all,\n\nAdded a post-deploy hook to Render that invalidates the CDN edge cache whenever a new build is published. Users will always receive the latest release without browser hard-refreshes.\n\nJack",
    "date": "2026-08-23T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-37",
    "threadId": "thread-marketing-campaign-metrics",
    "threadCount": 1,
    "from": {
      "name": "Jessica Taylor",
      "email": "jessica.t@marketingpro.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Product Hunt Launch Planning & Assets",
    "snippet": "Drafted the maker story, high-res screen recordings, and FAQ for our upcoming Product Hunt featured launch.",
    "body": "Hey team,\n\nHere is our launch checklist for next Tuesday on Product Hunt:\n- Animated GIF showing the AI copilot typing directly into the compose window\n- 60-second video demo showing instant voice/text search\n- Founder comment explaining why we built a zero-credit offline rule fallback\n\nPlease review the copy in the shared Google Doc.\n\nJessica",
    "date": "2026-08-22T03:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-38",
    "threadId": "thread-legal-trademark-filing",
    "threadCount": 1,
    "from": {
      "name": "Emily Watson",
      "email": "emily.watson@legalcounsel.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "USPTO Trademark Application Status: Official Action Notice",
    "snippet": "Our trademark application for the wordmark and icon passed initial examination without objections.",
    "body": "Hi,\n\nGreat news from the patent and trademark office! The examining attorney approved our application for publication in the Official Gazette.\n\nBarring third-party oppositions during the 30-day notice period, the certificate of registration will issue shortly thereafter.\n\nBest,\nEmily",
    "date": "2026-08-21T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "LEGAL"
    ]
  },
  {
    "emailId": "demo-39",
    "threadId": "thread-customer-success-milestone",
    "threadCount": 1,
    "from": {
      "name": "Liam O'Connor",
      "email": "liam@analyticsgroup.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "1,000,000 Emails Synced Milestone!",
    "snippet": "Our telemetry logged our 1,000,000th synchronized message today. Average end-to-end delivery latency: 220ms.",
    "body": "Huge milestone reached today!\n\nThe real-time sync engine processed its one-millionth message with zero message drops and 99.99% socket connection reliability.\n\nCongratulations to everyone involved in scaling this architecture.\n\nLiam",
    "date": "2026-08-20T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-40",
    "threadId": "thread-ai-ethics-review",
    "threadCount": 1,
    "from": {
      "name": "Elena Rostova",
      "email": "elena@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Responsible AI & Data Privacy Whitepaper Draft",
    "snippet": "Authored our technical whitepaper on user privacy in LLM-driven email assistants.",
    "body": "Hi Team,\n\nI finished the first draft of our technical whitepaper detailing our data hygiene principles:\n1. Zero data retention for LLM prompt context\n2. Pure client-side filtering whenever possible\n3. Transparent intent action verification cards\n\nI believe publishing this will build tremendous trust with both individual and corporate users.\n\nElena",
    "date": "2026-08-19T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-41",
    "threadId": "thread-hardware-refresh-alice",
    "threadCount": 1,
    "from": {
      "name": "Alice Walker",
      "email": "alice.walker@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Annual Engineering Workstation Upgrades",
    "snippet": "IT opened the procurement portal for M3 Max MacBook Pros or ThinkPad workstations. Submit your choices by Friday.",
    "body": "Hi Engineering,\n\nOur annual equipment refresh is now open. If your primary laptop is over 24 months old, please head over to the internal IT portal and select your preferred hardware configuration.\n\nOrders will ship within 10 business days.\n\nAlice",
    "date": "2026-08-18T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-42",
    "threadId": "thread-figma-community-plugin",
    "threadCount": 1,
    "from": {
      "name": "Sarah Chen",
      "email": "sarah.c@designsystems.dev"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "New Glassmorphic UI Kit Published on Figma Community",
    "snippet": "Our open-source component library already surpassed 1,500 duplicate downloads in 48 hours.",
    "body": "Hey everyone,\n\nThe frosted glass UI kit we open-sourced on Figma Community has been trending #1 in the design systems category!\n\nLots of designers are praising our token setup and keyboard-first accessibility.\n\nSarah",
    "date": "2026-08-17T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-43",
    "threadId": "thread-cyber-insurance-renewal",
    "threadCount": 1,
    "from": {
      "name": "Michael Chang",
      "email": "m.chang@securityaudit.org"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Cyber Liability Insurance Policy Binding Complete",
    "snippet": "Policy underwritten with $5M aggregate limit and zero security exclusions.",
    "body": "Hi Management,\n\nOur broker has bound the cyber liability policy with Lloyd's of London. Because of our multi-factor authentication enforcement and clean SOC2 audit, our annual premium dropped by 18%.\n\nBinder documentation is stored in our compliance vault.\n\nMichael",
    "date": "2026-08-16T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "SECURITY"
    ]
  },
  {
    "emailId": "demo-44",
    "threadId": "thread-venture-partner-dinner",
    "threadCount": 1,
    "from": {
      "name": "John Davis",
      "email": "john.davis@ventures.co"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Annual Founders Dinner in San Francisco - October 18",
    "snippet": "Inviting you to our intimate gathering of 20 portfolio founders and technical leaders at Spruce.",
    "body": "Hi,\n\nEvery autumn we bring together our portfolio founders for an evening of conversation and great food. I would love for you to join us at Spruce in Presidio Heights on Thursday, October 18 at 6:30 PM.\n\nNo pitches or presentations—just a relaxed evening connecting with peers.\n\nPlease RSVP when you have a moment.\n\nBest,\nJohn Davis",
    "date": "2026-08-15T03:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX",
      "IMPORTANT"
    ]
  },
  {
    "emailId": "demo-45",
    "threadId": "thread-cloud-cost-savings",
    "threadCount": 1,
    "from": {
      "name": "Jack Miller",
      "email": "jack.miller@cloudops.net"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Infrastructure Cost Optimization: Saved $850/mo with Single Service",
    "snippet": "Consolidating client static hosting and API routing onto Render reduced egress latency and hosting overhead.",
    "body": "Team,\n\nMonthly infrastructure cost report:\n- Previous multi-service split: $1,420/month\n- Current unified deployment: $570/month\n- Total monthly savings: $850/month (60% reduction)\n\nP99 latency across all domestic endpoints also improved by 45ms.\n\nJack",
    "date": "2026-08-14T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "UPDATES"
    ]
  },
  {
    "emailId": "demo-46",
    "threadId": "thread-patent-filing-ai-intent",
    "threadCount": 1,
    "from": {
      "name": "Emily Watson",
      "email": "emily.watson@legalcounsel.com"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Provisional Patent Application Filed: Programmatic UI Manipulation",
    "snippet": "Filed US Provisional Patent Application No. 63/981,204 for \"Direct Programmatic UI Generation via Natural Language\".",
    "body": "Hi all,\n\nWe successfully filed our provisional patent application protecting the architecture behind direct programmatic UI execution by an LLM copilot.\n\nThis secures our priority date and gives us 12 months to convert into a full utility application.\n\nBest,\nEmily",
    "date": "2026-08-13T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "LEGAL"
    ]
  },
  {
    "emailId": "demo-47",
    "threadId": "thread-community-hackathon-sponsor",
    "threadCount": 1,
    "from": {
      "name": "Rachel Green",
      "email": "rachel@designhub.studio"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Sponsoring the Bay Area AI Hacks 2026",
    "snippet": "Providing API access and prize bounties for the best assistive productivity workflows.",
    "body": "Hi,\n\nWe agreed to sponsor the track \"AI for Everyday Life\" at Bay Area AI Hacks next month. Over 400 collegiate developers have registered.\n\nWe will offer a $2,500 grand prize for the most creative application utilizing intelligent UI copilots.\n\nRachel",
    "date": "2026-08-12T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-48",
    "threadId": "thread-quarterly-dividend-david",
    "threadCount": 1,
    "from": {
      "name": "David Kim",
      "email": "david.kim@fintech.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Corporate Treasury Yield & Cash Reserve Report",
    "snippet": "Yield on sweep treasury account reached 5.15% annualized. Total liquidity: $2.4M.",
    "body": "Team,\n\nOur treasury liquidity statement:\n- Operating Cash: $650,000\n- US Treasury Bills (3-month duration): $1,750,000\n- Blended yield: 5.15%\n\nOur runway remains over 36 months at current burn rate.\n\nDavid",
    "date": "2026-08-11T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX",
      "FINANCE"
    ]
  },
  {
    "emailId": "demo-49",
    "threadId": "thread-ai-safety-benchmarks",
    "threadCount": 1,
    "from": {
      "name": "Elena Rostova",
      "email": "elena@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Adversarial Prompt Injection Testing: 100% Defense Rate",
    "snippet": "Tested 500 adversarial jailbreak and prompt injection samples against our intent parser. All were safely neutralized.",
    "body": "Hi Team,\n\nWe ran automated red-teaming against our AI command pipeline using known prompt injection datasets.\n\nResults:\n- Strict schema validation caught 100% of out-of-scope system prompts\n- No unauthorized email deletions or data exposures were possible\n- Clean separation between system instructions and user email text\n\nElena",
    "date": "2026-08-10T03:00:48.693Z",
    "isRead": true,
    "labels": [
      "INBOX"
    ]
  },
  {
    "emailId": "demo-50",
    "threadId": "thread-welcome-to-ai-mail",
    "threadCount": 1,
    "from": {
      "name": "Alice Walker",
      "email": "alice.walker@techcorp.io"
    },
    "to": [
      {
        "name": "You",
        "email": "user@aimail.com"
      }
    ],
    "subject": "Welcome to AI Mail! Tips for Getting the Most Out of Your Copilot",
    "snippet": "Try typing commands like \"Compose to Jack about the release\", \"Show unread emails\", or hit \"C\" on your keyboard.",
    "body": "Welcome to the AI Mail Assistant!\n\nHere are 3 quick things you can try right now:\n1. Hit \"C\" on your keyboard to instantly open the compose window.\n2. In the AI Assistant on the right, type: \"Send an email to Jack about the server status\" and watch it automatically fill out the form.\n3. Type \"Show unread emails\" or \"Open the latest email from Alice\" to navigate your inbox completely hands-free.\n\nEnjoy experiencing the future of email!\n\nWarmly,\nAlice Walker & The AI Mail Team",
    "date": "2026-08-09T03:00:48.693Z",
    "isRead": false,
    "labels": [
      "INBOX",
      "IMPORTANT"
    ]
  }
];

module.exports = { DEMO_EMAILS };
