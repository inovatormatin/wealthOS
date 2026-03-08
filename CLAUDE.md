# WealthOS — AI-Powered Personal Finance & Wealth Manager
> Product Plan | March 2026 | INTERNAL PLANNING DOCUMENT — NOT FOR DISTRIBUTION

---

## 1. Product Vision

WealthOS is a personal AI-powered wealth manager built specifically for Indian users. The core idea is to have one app that does everything a good CA or financial advisor would do — tracks every rupee in and out, manages investments across asset classes, researches companies fundamentally before you invest, and gives real financial guidance powered by AI that is always updated with current market conditions.

The product is built for the Indian market — Indian stocks (NSE/BSE), Indian government schemes, Indian tax laws (80C, HRA, etc.), and Indian investment instruments like PPF, FD, RD, and digital gold.

### Problem We Are Solving
- Most Indians manage finances across 4-5 different apps — one for stocks, one for MFs, one for expenses, one for FDs
- No single app gives CA-level guidance tailored to your personal financial situation
- Stock advice apps either violate SEBI rules or give generic useless tips
- No app connects cash flow, investments, goals, and tax planning in one place

### Our Solution
- One dashboard for all money — inflows, outflows, investments, goals
- AI advisor with full context of your finances — not generic advice
- Company fundamental research (fully legal, no SEBI issues) instead of buy/sell tips
- Real-time web search for latest government schemes, insurance plans, market news
- Tax corner, insurance tracker, and goal planner all in one place

---

## 2. Target Users

| Phase | Who | Description |
|-------|-----|-------------|
| V1 — Personal | Single user (owner) | Built and used by one person. No public access. Used to validate the product and build habits around it. |
| V2 — Close Circle | Friends and family | Invite-only access. Small group of trusted users to gather early feedback before going public. |
| V3 — Public SaaS | Indian salaried professionals, freelancers, small business owners aged 22-45 | Anyone who wants a smarter way to manage money and grow wealth in India. |

---

## 3. Key Decisions (LOCKED — Do Not Change Without Strong Reason)

### 3.1 — SEBI Compliance Strategy
We will NOT give buy or sell recommendations for stocks. This avoids SEBI RIA (Registered Investment Advisor) licensing requirements entirely. Instead the app will show company fundamentals — revenue growth, profit margins, debt-to-equity, ROE, sector position — and let the user decide. All AI responses on stocks will carry a disclaimer: 'Not SEBI registered advice. Do your own research.'

### 3.2 — No Bank Account Sync
We will NOT integrate with the RBI Account Aggregator framework or any bank APIs. All transactions are entered manually by the user. This keeps the product simple, avoids all RBI compliance complexity, and is perfectly fine for personal use.

### 3.3 — EOD Stock Price Update Strategy
Live stock price APIs are expensive and unnecessary for a personal portfolio tracker. After market close at 3:30 PM, prices are updated using the following fallback chain:
- **Step 1** — Yahoo Finance (free, unofficial, works for NSE tickers)
- **Step 2** — Alpha Vantage (25 free calls per day, enough for a personal portfolio)
- **Step 3** — If both fail, Claude AI fetches the price via web search automatically

### 3.4 — Multi-User Architecture from Day One
Even though V1 is for personal use only, the app is built with multi-user architecture from the start. Proper login system, user-specific data isolation in the database, no shortcuts that would require rebuilding auth later.

### 3.5 — Custom JWT Authentication
Custom JWT authentication on the Node.js backend was chosen over Firebase Auth or other services because it gives full control over token logic, no vendor lock-in on auth, and is easy to extend later with phone OTP or biometric login. Supports Email + Password and Google OAuth from day one.

### 3.6 — Firebase Firestore Instead of Supabase
Supabase was initially considered but rejected. It has known and unresolved connectivity issues in India — Jio and Airtel block certain Supabase IP ranges, making it unreliable on Indian mobile networks. Firebase Firestore was chosen instead. Google CDN has zero ISP blocking issues in India, works on all Indian networks, and the free tier (50,000 reads/day, 20,000 writes/day, 1GB storage) is more than sufficient.

---

## 4. Feature List

### V1 — Launch Features

#### Onboarding and Profile
- One-time profile setup on first login
- Fields: Name, Age, City, Monthly Income, Risk Appetite, Financial Goals
- Profile is editable anytime from settings
- Profile data feeds into the AI advisor for personalized responses

#### Dashboard
- Monthly snapshot: total inflow, outflow, net savings, portfolio value, total P&L
- 6-month cash flow area chart (inflow vs outflow side by side)
- Portfolio allocation pie chart by asset type
- Expense category breakdown for the current month

#### Transactions
- Manually add: type (in/out), category, amount, date, note
- Edit and delete any transaction
- Filter by month, category, and transaction type
- Category-wise monthly summary

#### Portfolio Tracker
- Add holdings across: Stocks, Mutual Funds, FD, RD, Gold, PPF
- Store: asset name, NSE ticker (for stocks), buy price, number of units, purchase date
- EOD price update: free API first, AI fallback if unavailable
- Auto-calculates current value, P&L (absolute and percentage), overall portfolio return
- Holdings table and portfolio mix pie chart

### V2 — Right After V1 is Stable

#### Company Research
- Search any company by NSE/BSE ticker or name
- AI fetches and presents: revenue growth, profit margins, debt-to-equity, ROE, sector position, recent news
- Watchlist to save companies you are tracking
- No buy/sell recommendations ever — purely factual fundamental data

#### AI Financial Advisor
- Persistent chat with full awareness of your profile, portfolio, and transactions
- Covers: investment strategies, FD vs SIP vs RD, tax saving, insurance, business ideas
- Web search enabled — always based on current market conditions
- All stock responses carry SEBI disclaimer

#### Goals Tracker
- Create goals: name, target amount, deadline
- Track progress with visual progress bar
- Auto-calculates required monthly savings to reach goal on time

#### Insurance Tracker
- Log policies: health, term, car
- Store: provider, premium, renewal date, sum assured
- Renewal reminders before expiry
- AI identifies coverage gaps based on age and income

#### Tax Corner
- Track 80C investments: ELSS, PPF, LIC, home loan principal
- Track 80D (health insurance) and HRA
- Visual tracker: how much of Rs 1.5 lakh 80C limit is used
- AI recommends where to invest more before March 31

---

## 5. User Flow

| Step | Screen | What Happens |
|------|--------|--------------|
| 1 | Landing Page | User arrives, sees what WealthOS does, clicks Sign Up |
| 2 | Register | Enters email + password OR signs in with Google |
| 3 | Onboarding | Fills profile — name, age, income, risk level, goals. Saved to database. |
| 4 | Dashboard | Sees financial overview. Empty state on first visit with prompts to add data. |
| 5 | Transactions | User adds income and expenses manually on a regular basis |
| 6 | Portfolio | User adds existing holdings. Updates EOD prices after 3:30 PM each day. |
| 7 | Dashboard | Charts and stats update automatically from entered data |
| 8 — V2 | Research Tab | Before buying a stock, user reads company fundamentals here |
| 9 — V2 | AI Advisor | User asks financial questions, AI responds with full personal context |
| 10 — V2 | Goals | User tracks goal progress monthly and adjusts savings |
| 11 — V2 | Tax Corner | Before March 31, user checks 80C usage and acts on AI suggestions |

---

## 6. Tech Stack (Final — Do Not Change)

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + Vite | Fast SPA, great ecosystem, easy to build and maintain |
| Styling | Tailwind CSS | Utility-first, clean, no CSS file bloat |
| Backend | Node.js + Express | JavaScript end-to-end, fast to build, large ecosystem |
| Authentication | Custom JWT (Node.js) | Full control, no vendor lock-in, easy to extend with OTP later |
| Database | Firebase Firestore | No India ISP issues, generous free tier, document model fits our data well |
| Frontend Hosting | Vercel | Free, instant deploys from GitHub, excellent developer experience |
| Backend Hosting | Vercel Serverless Functions | Everything on one platform, no separate server to manage |
| AI Engine | Anthropic Claude API | Powers the AI advisor, company research, and EOD price fallback |
| Stock Price — Primary | Yahoo Finance API | Free, unofficial, no API key needed, supports NSE tickers |
| Stock Price — Backup | Alpha Vantage | 25 free calls per day, enough for a personal portfolio |
| Stock Price — Final Fallback | Claude web search | If both APIs fail, AI fetches the price from the web automatically |

---

## 7. Database Structure (Firestore)

Each user's data is fully isolated under their own user ID. No user can ever access another user's data.

| Collection Path | What It Stores | Key Fields |
|----------------|---------------|------------|
| /users/{userId} | User profile | name, age, city, monthly_income, risk_level, goals, created_at |
| /users/{userId}/transactions/{txId} | All income and expense entries | type, category, amount, date, note, created_at |
| /users/{userId}/holdings/{holdingId} | Portfolio holdings | asset_type, name, ticker, buy_price, current_price, units, last_price_updated |
| /users/{userId}/price_updates/{logId} | Log of every EOD price fetch | ticker, price, source (api/ai/manual), fetched_at |
| /users/{userId}/goals/{goalId} | (V2) Wealth goals | name, target_amount, saved_amount, deadline |
| /users/{userId}/insurance/{policyId} | (V2) Insurance policies | type, provider, premium, renewal_date, sum_assured |
| /users/{userId}/tax_entries/{entryId} | (V2) Tax deduction entries | section, description, amount, financial_year |
| /watchlist/{userId}/companies/{companyId} | (V2) Watchlisted companies | ticker, name, added_at, notes |

---

## 8. Cost Estimate

| Service | Free Tier | Paid at Scale | Notes |
|---------|-----------|---------------|-------|
| Firebase Firestore | 50k reads/day, 20k writes/day, 1GB | $0.06 per 100k reads | Free tier lasts a very long time at personal scale |
| Firebase Auth | 10,000 verifications/month | Free up to 10k/month | Google OAuth is free always |
| Vercel | 100GB bandwidth, 100k function calls/month | $20/month Pro | Free tier sufficient for V1 and early V2 |
| Anthropic Claude API | Pay per use, no monthly minimum | ~Rs 2-5 per AI query | Only charged when AI features are used |
| Yahoo Finance API | Free, no key needed | Free | Unofficial — monitor for breakage |
| Alpha Vantage | 25 calls/day free | $50/month premium | Free tier is enough for personal portfolio |
| **Total — V1 Personal Use** | **Rs 0/month** | **Rs 0/month** | Runs completely free at personal scale |
| **Total — 1000+ Users** | — | **Rs 2,500-4,000/month** | Scales affordably as the user base grows |

---

## 9. Risks and Mitigations

| Risk | Likelihood | How We Handle It |
|------|-----------|-----------------|
| Yahoo Finance API breaks (unofficial) | Medium | Alpha Vantage is the backup. Claude web search is the final fallback. User can also enter price manually. |
| Firestore read costs spike with many users | Low for V1, medium for V3 | Set Firebase budget alerts at $5. Cache frequently read data. Optimize queries early. |
| JWT token security issue | Low if done correctly | Use httpOnly cookies for refresh tokens. Short-lived access tokens (15 min expiry). Secure refresh endpoint. |
| Claude API costs grow at scale | Medium at V3 | Cache AI responses for repeated queries. Rate limit AI calls per user per day. |
| SEBI compliance issue from AI responses | Low if guidelines followed | Never generate buy/sell advice. Show only factual data. Always show disclaimer on every response. |

---

## 10. Build Plan — V1 Sprints

| Sprint | Duration | What Gets Built |
|--------|----------|----------------|
| Sprint 1 — Foundation | 2-3 days | GitHub repo. React + Vite + Tailwind scaffold. Firebase project and Firestore rules. Node.js + Express on Vercel Serverless Functions. Custom JWT auth: register, login, Google OAuth, access token, refresh token. |
| Sprint 2 — Onboarding + Dashboard | 3-4 days | Onboarding form saving to Firestore. Dashboard layout with stat cards and charts. All data wired to real Firestore data for the logged-in user. |
| Sprint 3 — Transactions | 3 days | Add, edit, delete transactions. Filter by month and category. Dashboard charts update from real transaction data. |
| Sprint 4 — Portfolio | 4-5 days | Add, edit, delete holdings. EOD price update flow with API fallback chain. P&L and return percentage auto-calculated. Portfolio chart and holdings table. |
| Sprint 5 — Polish + Deploy | 2-3 days | Mobile responsive layout. Error handling and loading states. Deploy to Vercel. End-to-end testing. |
| **Total** | **3-4 weeks** | Working at a comfortable pace. |

---

## 11. V2 Plan — Right After V1 is Stable

V2 begins immediately after V1 is deployed and working well. No fixed timeline — it starts when V1 feels solid and dependable.

| Feature | What It Does |
|---------|-------------|
| Company Research | Search any NSE/BSE company. AI fetches fundamentals: revenue, margins, ROE, debt ratio, news. Watchlist to track companies. No buy/sell advice ever. |
| AI Financial Advisor | Chat interface with full awareness of user profile, all transactions, and portfolio. Covers investments, insurance, tax saving, business ideas. Web search enabled for current information. |
| Goals Tracker | Set wealth goals with target amount and deadline. Track progress. See required monthly savings to hit goal on time. |
| Insurance Tracker | Log all policies. Get renewal reminders. AI identifies coverage gaps based on income and age. |
| Tax Corner | Track all 80C, 80D, and HRA deductions. Visual progress toward Rs 1.5 lakh limit. AI recommends where to invest more before March 31. |

---

*This document captures all planning decisions made as of March 2026. Update it whenever a major decision changes.*
