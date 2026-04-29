# SweatGlow App

This is a small Node.js + Express project that serves your pink/purple fitness timer frontend and records completed workout sessions.

## Files
- `server.js` - backend server
- `package.json` - Node dependency manifest
- `public/index.html` - frontend UI
- `public/app.js` - frontend JavaScript logic and API integration
- `data/sessions.json` - local session storage file

## Setup
1. Install Node.js from https://nodejs.org/ if not already installed.
2. Open a terminal in `C:\Users\FMOTEN.25915\sweatglow-app`.
3. Run:
   ```powershell
   npm install
   npm start
   ```
4. Open `http://localhost:3000` in your browser.

## What works
- Backend API at `/api/exercises`, `/api/stats`, and `/api/session`
- Frontend fetches exercises from the server
- Completed sessions are saved to `data/sessions.json`
- Stats update automatically after each completed set

## Notes
- If Node is not installed, the backend will not run yet.
- The app is built to work with static files served by Express and connected through JavaScript fetch calls.
