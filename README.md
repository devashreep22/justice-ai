# JusticeAI

**JusticeAI Hackathon Project**

- Description: AI-powered legal assistance platform
- Team: Farheen Shinda , Saniya Pathan , Devashree Pathak
- Tech stack: Python, Node.js, React, Supabase, etc.
- Hackathon: 

## Project Structure

- `frontend/` - Main Next.js website frontend (includes Learn More, SOS UI, Support/Advertise UI)
- `backend/` - Main Node.js API backend (includes auth, case APIs, SOS API, monetization/advertise APIs)
- `chatbot/` - Standalone chatbot app files only (separate from main website flow)
- `docs/` - Setup, testing, and launch documentation
- `scripts/` - Helper scripts
- `logs/` - Local runtime logs

### Important Ownership

- Main website monetization and advertisement:
  - Frontend: `frontend/app/page.tsx`
  - Backend routes: `backend/routes/monetization.js`
- Main website SOS:
  - Frontend: `frontend/app/page.tsx`
  - Backend route: `backend/routes/cases.js` (`POST /api/cases/public/sos`)
- Chatbot-specific code stays under `chatbot/` and should not contain main website monetization flow.
