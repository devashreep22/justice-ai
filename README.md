# JusticeAI

AI-Powered Legal Assistance Platform

JusticeAI is an AI-driven legal assistance platform designed to help citizens file complaints, receive legal guidance, and interact with the justice system digitally.

The platform simplifies legal processes using an AI chatbot, structured complaint filing, and role-based access for police officers, lawyers, and citizens.

Built during the Codekshetra Hackathon.

---

## Team

- Devashree Pathak
- Farheen Shinda
- Saniya Pathan

---

## Features

### AI Legal Chatbot
- Provides instant legal guidance
- Answers common legal queries
- Helps users understand their legal rights

### Complaint Filing System
- Structured complaint submission
- Secure case registration
- Organized complaint records

### Role-Based Access

Separate dashboards for:

- Citizens
- Police Officers
- Lawyers
- Admin

### Secure Authentication

- User login and registration
- Role-based access control
- Supabase authentication

### Case Management

- Police can review complaints
- Lawyers can access case information
- Admin can manage users

### Web Interface

- Responsive frontend interface
- User-friendly complaint filing forms
- Clean and modern UI

---

## Tech Stack

### Frontend
- Next.js
- React
- TailwindCSS

### Backend
- Node.js
- Express.js

### AI / Chatbot
- Python

### Database
- Supabase (PostgreSQL)

### Deployment
- Vercel
- Render

---

## Project Structure

```
justice-ai/
│
├── frontend/        # Next.js frontend application
├── backend/         # Node.js API backend
├── chatbot/         # AI chatbot source code
├── deploy/          # Deployment configuration
├── docs/            # Setup and documentation files
├── scripts/         # Helper scripts for running services
├── logs/            # Local runtime logs
│
├── .env.example     # Environment variables template
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/devashreep22/justice-ai.git
cd justice-ai
```

---

## Running the Project Locally

### Start Backend

```bash
cd backend
npm install
npm start
```

Backend runs on:

```
http://localhost:3001
```

---

### Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:3000
```

---

### Run Chatbot

```bash
cd chatbot
pip install -r requirements.txt
python app.py
```

---

## Environment Variables

Create a `.env` file based on `.env.example`.


## API Example

Example request:

```
POST /api/auth/signup
```

Example payload:

```json
{
  "email": "police1@email.com",
  "password": "police123456",
  
}
```

```json
{
  "email": "lawyer1@gmail.com",
  "password": "lawyer123456",
  
}
```

```json
{
  "email": "admin@justiceai.com",
  "password": "Password123!",
}
```

---

## Deployment

Frontend deployed on Vercel.  
Backend deployed on Render.

Deployment configuration files are available in the `deploy` directory.

---
