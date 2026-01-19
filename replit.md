# Hackathon FNCT 2026 Platform

## Overview
This is a React + Vite + TypeScript web application for the Hackathon FNCT 2026 - a municipal hackathon platform in Tunisia focused on territorial innovation.

## Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 3
- **External Services**: Supabase (backend/database), Google GenAI

## Project Structure
- `/` - Root contains main app files (App.tsx, index.tsx, index.html)
- `/components/` - React components
- `/pages/` - Page components
- `/lib/` - Utility libraries (including Supabase client)
- `/img/` - Image assets

## Running the Application
- Development: `npm run dev` (runs on port 5000)
- Build: `npm run build` (outputs to /dist)
- Preview: `npm run preview`

## Configuration
- Vite config in `vite.config.ts`
- Tailwind config in `tailwind.config.js`
- PostCSS config in `postcss.config.js`
- TypeScript config in `tsconfig.json`

## Deployment
Configured for static deployment. Build outputs to `dist/` directory.

## Environment Variables
- `API_KEY` or `VITE_API_KEY` - API key for external services
