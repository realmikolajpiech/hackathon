# Detective AI

A noir detective game where every case is unique. Explore a procedurally generated low-poly city, pick a case from your office, then interrogate AI-powered suspects using real voice via Gemini Live API.

## Prerequisites

- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey)

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```bash
GEMINI_API_KEY=your_api_key_here
```

## Running locally

```bash
npm run dev
```

This starts both the Vite dev server (frontend) and the local proxy server on port 3001 (handles Gemini API calls and Gemini Live WebSocket).

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How to play

1. Start the game — Gemini generates a unique murder case with suspects and clues
2. Walk around the city and enter buildings to find and talk to suspects
3. Use your **voice** to interrogate them in real time (Gemini Live API)
4. Check your detective notebook for clues
5. Accuse the right suspect to win

## Deployment (Vercel)

```bash
vercel deploy
```

Set `GEMINI_API_KEY` as an environment variable in your Vercel project settings. The `api/gemini.ts` serverless function handles API proxying in production.

## Tech stack

- React + Vite + TypeScript
- React Three Fiber / Three.js — 3D isometric city
- TypeGPU — GPU-powered visual effects
- Zustand — game state
- Gemini 2.0 Flash — case generation and NPC dialogue
- Gemini Live API — real-time voice conversations with suspects
