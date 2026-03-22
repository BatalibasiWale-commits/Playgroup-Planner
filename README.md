# 🌟 Playgroup Planner

A bright, friendly web app for playgroup coordinators to plan weekly sessions for children aged 0–5.

## Setup

**Prerequisites:** Node.js 18+ ([nodejs.org](https://nodejs.org) or `brew install node`)

```bash
cd playgroup-planner
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Features

### ✨ AI Activity Generator
- Enter a weekly theme, age group, available materials & session duration
- Claude generates 4 tailored activities with instructions, materials, and developmental benefits
- Save individual activities or all at once to your library

### 📖 Activity Library
- Browse all saved activities in a colourful card grid
- Filter by activity type (Arts & Crafts, Sensory, Music & Movement, Storytelling, Outdoor)
- Filter by age group (0–1, 1–2, 2–3, 3–5)
- Add any activity to a specific day in the weekly planner

### 📅 Weekly Planner
- 5-day Mon–Fri view with colour-coded day columns
- Navigate between weeks (past and future)
- Mark activities as Done with a progress tracker
- Print/export view for posting on the wall
- Archive completed weeks to the History Log

### 🕐 History Log
- Reverse-chronological list of all archived weeks
- Expandable entries showing day-by-day breakdown
- Completion percentage for each week

## API Key

You need an Anthropic API key for the AI generator:
1. Get one at [console.anthropic.com](https://console.anthropic.com)
2. Click the 🔴 **Set API Key** button in the app
3. Your key is stored locally in your browser — never sent anywhere except Anthropic's API

## Tech Stack

- **React 18** + TypeScript
- **Tailwind CSS** — warm, playful colour palette
- **Vite** — fast dev server & build
- **Anthropic SDK** — streaming AI activity generation
- **localStorage** — all data persists in the browser
