# Deployment Guide for YouTube Together

## Important Note
This application requires a WebSocket server (Socket.io) for real-time synchronization. Cloudflare Pages only supports static sites, so you'll need to deploy the server separately.

## Architecture for Production

### Option 1: Split Deployment (Recommended)
- **Frontend**: Deploy on Cloudflare Pages
- **Backend**: Deploy Socket.io server on a service like:
  - Railway.app
  - Render.com
  - Fly.io
  - Heroku
  - AWS EC2/ECS
  - DigitalOcean App Platform

### Option 2: Full-Stack Platform
Deploy the entire application on a platform that supports both frontend and backend:
- Vercel (with serverless functions)
- Railway.app
- Render.com
- Heroku

## Deploying Frontend on Cloudflare Pages

### Prerequisites
1. GitHub repository (already done: https://github.com/Jp220124/YoutubeTogether)
2. Cloudflare account

### Steps

1. **Prepare for Static Export**
   First, update the Next.js configuration for static export:

   ```javascript
   // next.config.ts
   const nextConfig = {
     output: 'export', // Add this for static export
     images: {
       unoptimized: true // Required for static export
     }
   };
   ```

2. **Update Socket.io Connection**
   Create an environment variable for the backend URL:

   ```typescript
   // lib/socket/socket.ts
   const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

   export const initSocket = () => {
     if (!socket) {
       socket = io(SOCKET_URL);
     }
     return socket;
   };
   ```

3. **Deploy on Cloudflare Pages**

   a. Go to [Cloudflare Pages](https://pages.cloudflare.com/)

   b. Click "Create a project"

   c. Connect your GitHub account and select the repository

   d. Configure build settings:
      - Framework preset: `Next.js (Static HTML Export)`
      - Build command: `npm run build`
      - Build output directory: `out`

   e. Add environment variables:
      - `NEXT_PUBLIC_SOCKET_URL`: Your backend server URL (after deploying backend)

   f. Click "Save and Deploy"

## Deploying Backend Server

### Option A: Deploy on Railway.app (Easiest)

1. Create a separate repository for the server:
   ```bash
   mkdir youtubetogether-server
   cd youtubetogether-server
   ```

2. Copy the server file and create package.json:
   ```json
   {
     "name": "youtubetogether-server",
     "version": "1.0.0",
     "main": "server.js",
     "scripts": {
       "start": "node server.js"
     },
     "dependencies": {
       "socket.io": "^4.7.2",
       "cors": "^2.8.5"
     }
   }
   ```

3. Update server.js for standalone deployment:
   ```javascript
   const { createServer } = require('http');
   const { Server } = require('socket.io');

   const httpServer = createServer();
   const io = new Server(httpServer, {
     cors: {
       origin: process.env.CLIENT_URL || 'http://localhost:3000',
       methods: ['GET', 'POST']
     }
   });

   // ... rest of your socket.io logic ...

   const PORT = process.env.PORT || 3001;
   httpServer.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

4. Deploy on Railway:
   - Go to [Railway.app](https://railway.app/)
   - Create new project
   - Deploy from GitHub
   - Add environment variable: `CLIENT_URL` = Your Cloudflare Pages URL

### Option B: Deploy on Render.com

1. Create account on [Render.com](https://render.com/)
2. New > Web Service
3. Connect GitHub repository
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add environment variables

## Environment Variables

### Frontend (Cloudflare Pages)
- `NEXT_PUBLIC_SOCKET_URL`: Backend server URL (e.g., https://your-server.railway.app)

### Backend (Railway/Render/etc)
- `CLIENT_URL`: Frontend URL (e.g., https://your-app.pages.dev)
- `PORT`: Usually set automatically by the platform

## Testing Deployment

1. Visit your Cloudflare Pages URL
2. Create a room
3. Open in another browser/incognito
4. Join the same room
5. Test video synchronization

## Troubleshooting

### CORS Issues
Make sure the backend server has the correct CLIENT_URL in environment variables.

### WebSocket Connection Failed
- Check if backend server is running
- Verify NEXT_PUBLIC_SOCKET_URL is correct
- Check browser console for errors

### Video Not Loading
- YouTube IFrame API might be blocked
- Check Content Security Policy headers

## Alternative: Vercel Deployment

If you want an easier all-in-one solution, consider Vercel:

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow prompts
4. Vercel will handle both frontend and API routes

Note: You'll need to convert the Socket.io server to use Vercel's serverless functions or use a separate WebSocket service like Pusher or Ably.