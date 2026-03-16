# CLAUDE.md — Spoonly

## Project Overview
Spoonly is a React + Node.js app where an AI agent simultaneously negotiates hyper-local food exchanges with multiple neighbors to reduce food waste. It uses NVIDIA Nemotron Ultra 253B to run parallel agent threads — one per neighbor — all firing at the same time.

---

## Tech Stack
- **Frontend:** React (Vite), inline styles only, Inter font, dark-mode friendly, indigo accent `#6366f1`
- **Backend:** Express (Node.js)
- **AI Model:** `nvidia/llama-3.1-nemotron-ultra-253b-v1` via `https://integrate.api.nvidia.com/v1/chat/completions`
- **Auth:** Google OAuth 2.0 via `googleapis` npm package
- **No UI libraries** — inline styles only

---

## Repo Structure
```
/client        React frontend (Vite)
/server        Express backend
```

---

## Environment Variables
See `.env.example`:
```
NVIDIA_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
```
Never hardcode secrets. Always load via `dotenv`.

---

## Backend Routes

### `GET /auth/google`
- Redirects to Google OAuth consent screen
- Scope: `https://www.googleapis.com/auth/calendar.readonly`

### `GET /auth/google/callback`
- Exchanges code for tokens
- Fetches tomorrow's calendar events (`timeMin`/`timeMax` = start/end of tomorrow, user's local timezone)
- Returns: `[{ summary, start, end }]`
- Stores tokens in memory (no database needed)

### `POST /api/negotiate-all`
Core route. Accepts:
```json
{
  "userProfile": { "name", "diet", "allergies", "goals" },
  "calendarEvents": [...],
  "transactions": [...],
  "neighbors": [{ "id", "name", "avatar", "food", "description", "portions", "priceRange", "color" }]
}
```

**Logic:**
1. Derive a plain-English schedule summary from `calendarEvents`
2. Derive a plain-English spending summary from `transactions`
3. Launch one async negotiation per neighbor — all in parallel via Promise.all, never sequential awaits. A shared dealClosed boolean is set to true the moment any negotiation detects [DEAL CLOSED ✓]. Every other negotiation checks this flag at the start of each turn loop — if set, it immediately emits [PASS] with reason "Another deal was already locked in for tomorrow" and exits.
4. Each negotiation loops up to 6 turns (user agent speaks first, then neighbor agent, alternating)
5. End loop early on `[DEAL CLOSED ✓]` or `[PASS]`
6. Stream results as newline-delimited JSON:
   - `{ type: "message", neighborId, role, text, dealFlag, passFlag }`
   - `{ type: "done", neighborId, outcome: "deal" | "pass" | "negotiating" | "superseded" }`

**Agent Prompts:**
- User agent prompt: **same for all negotiations** — includes real schedule + spending context
- Neighbor agent prompt: **unique per neighbor** — reflects their food, price, personality

**Pass Logic — user agent should `[PASS]` when:**
- Food conflicts with dietary restrictions or allergies
- Neighbor's minimum price is significantly above user's typical spend
- Food type conflicts with health goals (e.g. samosas if goal is "low carb")
- Another neighbor's deal has already been confirmed in this session (dealClosed flag is true)




**Negotiate hard when:**
- Food matches user preferences
- User has a busy day with no lunch break
- User has been overspending on cafeteria food this week

---

## Frontend: Key Screens

### Onboarding (3 steps + progress bar)

**Step 1 — Profile**
- Fields: name, diet (select), allergies (text), health goals (text)

**Step 2 — Calendar**
- "Connect Google Calendar" → OAuth popup → `postMessage` returns events array
- "Use Demo Calendar" fallback → 6 hardcoded events:
  - 9:00–10:30 Sprint Planning
  - 11:00–11:30 1:1 with Manager
  - 12:00–13:00 Lunch & Learn
  - 14:00–15:30 Product Review
  - 16:00–17:00 Design Sync
  - 17:00–18:30 Stakeholder Demo Prep
- Show amber warning: "no free lunch window detected"

**Step 3 — Neighbors**
- 2x2 grid of neighbor cards, each with toggle "Include in negotiation" (default: on)
- "Activate My Agent" launches the negotiation dashboard

**Hardcoded Neighbors:**
| Neighbor | Food | Description | Portions | Price |
|---|---|---|---|---|
| Maria 👩‍🍳 | Chicken tortilla soup | Slow-cooked 4hrs | 3 | $9–$14 |
| James 🧔 | Sourdough + hummus board | Fresh baked this morning | 2 sets | $12–$18 |
| Linda 👵 | Vegetable curry with rice | Family recipe, gentle spices | 4 | $8–$13 |
| Priya 👩‍🦱 | Mango lassi + samosas (3pc) | Just made, still warm | 5 sets | $7–$11 |

---

### Negotiation Dashboard

- 2x2 grid, one panel per neighbor
- Each panel: header (avatar, name, food, status badge) + chat feed
- Status flow: `Waiting` → `Negotiating...` (pulsing dot) → `Deal ✅` or `Passed ⛔`
- Messages slide in: `translateY(8px)→0, opacity 0→1, 200ms ease`
- User agent bubbles: indigo (left); neighbor bubbles: neighbor's color (right)
- Real-time turn counter in header: "Turn 2/6"
- On deal: flash panel border green + "🎉 Deal Confirmed!" banner
- On superseded outcome: show "Deal already locked in for today — agent stood down" in a muted gray (not the red ⛔ of a real pass)
- All-done summary card: "Your agent ran 4 simultaneous negotiations. X deals closed. Y passed. Zero effort from you."

---

## Mock Spending Data (`useMockTransactions.js`)

Hardcoded 10 transactions from the past 14 days:
- 3x Office Cafeteria — $11.00
- 2x Sweetgreen — $14.50
- 1x Uber Eats — $23.80
- 1x Chipotle — $13.25
- 2x Whole Foods — $58.40, $44.10
- 1x Trader Joe's — $39.90

Shape: `{ date, name, amount, category: [string, string] }`
Categories: `["Food and Drink", "Restaurants"]` or `["Food and Drink", "Groceries"]`

Export `deriveSpendingContext(transactions)` → plain-English string used directly in agent system prompt.

---

## Demo Hardening (do last)

- Error boundary on every panel → "Agent reconnecting..." + retry (other panels unaffected)
- "Reset Demo" button (top right) → clears all state, returns to Step 1
- "Run All Again" on results screen → re-triggers negotiations without re-onboarding
- Confirm `Promise.all` is used — all 4 negotiations must start within 100ms of each other
- Footer: "Powered by NVIDIA Nemotron Ultra 253B — running parallel agent threads"
- Test full flow at `localhost:5173`, fix any CORS or hydration issues

---

## NVIDIA Talking Points
- "We use Nemotron Ultra 253B as the reasoning core for every agent."
- "We fire parallel inference calls — one per neighbor — using `Promise.all`, so all negotiations run simultaneously."
- "The agent's intelligence comes from real context: Google Calendar, spending patterns, dietary profile — all fed into the Nemotron system prompt."
- "The data flywheel: every closed deal teaches the agent what this user values. Over time, it negotiates better, faster, with less back-and-forth."

dealClosed must live outside the Promise.all array — in the enclosing function scope — so all four parallel threads share the same reference. That's what makes it work without a database.

