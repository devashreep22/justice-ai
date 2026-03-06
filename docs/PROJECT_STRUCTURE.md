# Project Structure Guide

This file defines where each feature should live.

## Top-Level Folders

- `frontend/`: Main website UI (Next.js).
- `backend/`: Main website backend APIs (Node/Express).
- `chatbot/`: Standalone chatbot app (separate from main website pages).
- `docs/`: Project docs.
- `scripts/`: Helper scripts.
- `logs/`: Runtime logs.

## Feature Ownership

### Learn More (Legal Awareness)
- UI: `frontend/app/page.tsx`

### SOS Alert System
- UI + client actions: `frontend/app/page.tsx`
- API: `backend/routes/cases.js`
- Endpoint: `POST /api/cases/public/sos`

### Monetization (Minimum Rs 100 Payment)
- UI: `frontend/app/page.tsx`
- API: `backend/routes/monetization.js`
- Endpoint: `POST /api/monetization/public/donation-intent`

### Advertisement Inquiry
- UI: `frontend/app/page.tsx`
- API: `backend/routes/monetization.js`
- Endpoint: `POST /api/monetization/public/advertise-intent`

### Chatbot
- Standalone chatbot files: `chatbot/`
- Main website chatbot integration: `frontend/app/page.tsx` + `backend/routes/chatbot.js`

## Notes

- Keep monetization/advertise APIs in `backend/routes/monetization.js` only.
- Keep SOS backend API in `backend/routes/cases.js`.
- Do not move main website monetization logic into `chatbot/`.
