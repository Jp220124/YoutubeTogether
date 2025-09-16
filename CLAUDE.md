# YoutubeTogether Frontend Project

## Quick Reference
- **Main sync logic**: `components/player/YouTubePlayer.tsx`
- **Room management**: `components/room/Room.tsx`
- **Dev server**: `npm run dev` (includes WebSocket server on port 3002)
- **Production build**: `npm run build && npm start`

## Current Implementation Status

### ✅ Completed Features
- Host/viewer role management with persistence
- Real-time video synchronization
- Mobile-responsive UI
- Chat functionality
- Room creation and joining
- iPad-specific optimizations
- Fullscreen support on all devices
- Touch controls for mobile viewers

### 🔧 Active Configurations
- **Sync Intervals**: Desktop (2s), iPad (10s)
- **Drift Thresholds**: Desktop (0.2s), Mobile (3s), iPad (5s)
- **Mobile Overlay**: Blocks video area, exposes bottom 48px for controls
- **Host Indicator**: Small badge at top-right, semi-transparent

## Testing Checklist
Before pushing changes, test:
- [ ] Desktop browser (Chrome/Firefox)
- [ ] Mobile phone (iOS Safari/Chrome)
- [ ] iPad (Safari)
- [ ] Sync accuracy when host seeks
- [ ] Fullscreen button visibility
- [ ] Initial tap-to-sync on mobile
- [ ] No lag/flickering during playback

## Common Issues & Quick Fixes

### "Only host controls" blocking video
- Check overlay positioning in YouTubePlayer.tsx
- Ensure indicator is at top-right, not center

### iPad lagging severely
- Verify iPad detection is working
- Check sync frequency is 10s not 2s
- Ensure seekTo threshold is 5s

### Fullscreen not accessible
- Check overlay height: `calc(100% - 48px)`
- Verify fs:1 in playerVars for mobile

### Video won't play on mobile
- Needs user gesture - check "Tap to sync" button
- Verify playsinline:1 is set

## npm Scripts
```json
{
  "dev": "node server/server.js",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## Environment Variables
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3002
```

## Git Workflow
```bash
# Always test before committing
npm run dev  # Test locally

# Commit with descriptive message
git add -A
git commit -m "Fix: [specific issue]"
git push origin main
```

## Code Style Guidelines
- Use TypeScript strict mode
- Prefer const over let
- Use optional chaining (?.) for safety
- Keep mobile compatibility in mind
- Test on real devices, not just browser DevTools

## Performance Considerations
- Minimize re-renders in Room component
- Debounce chat input
- Lazy load non-critical components
- Keep sync checks lightweight on mobile

## Dependencies to Note
- socket.io-client: ^4.8.1
- react-youtube: ^10.1.0
- framer-motion: ^11.11.17
- react-feather: ^2.0.10

@../CLAUDE.md for full project context