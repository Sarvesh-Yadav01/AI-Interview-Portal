# AI Interview Portal

AI-powered interview portal for candidate screening, resume analysis, proctored rounds, admin review, and automated feedback.

## Features

- Register, login, logout with JWT cookies
- Candidate dashboard with profile, interview history, score cards, and performance chart
- HR, aptitude, technical, and voice interview rounds
- Webcam and screen-share monitoring with security event capture
- AI feedback, scoring, communication tips, reports, and improvement suggestions
- Resume PDF upload with ATS-style AI resume analysis
- Admin dashboard for users, attempts, scores, terminations, and round usage
- Local fallback mode when `OPENAI_API_KEY` is not configured

## Tech Stack

- Node.js, Express.js, EJS
- MongoDB and Mongoose
- JWT cookies and Express sessions
- Multer resume uploads
- OpenAI integration
- Nodemailer SMTP emails

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Update `.env` with your local credentials:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/ai_interview_portal
JWT_SECRET=replace_with_a_long_random_secret
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=replace_with_another_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASS=replace_with_a_strong_admin_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
SMTP_FROM=AI Interview Portal <your_email@example.com>
```

Open `http://localhost:3000`.

## Production

```bash
npm install --omit=dev
npm start
```

Keep `.env` private. Use long random values for `JWT_SECRET` and `SESSION_SECRET`, and rotate any key, database password, SMTP password, or admin password that was shared publicly.
