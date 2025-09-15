const { createServer } = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Room management
const rooms = new Map();
const lastSyncTime = new Map(); // Track last sync time per room
// Map to track user sessions for host persistence
const userSessions = new Map(); // Maps sessionId -> { roomId, isHost }

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://youtubetogether.pages.dev',
      CLIENT_URL
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, username, sessionId }) => {
    socket.join(roomId);

    let shouldBeHost = false;

    if (!rooms.has(roomId)) {
      // New room - first user becomes host
      shouldBeHost = true;
      rooms.set(roomId, {
        id: roomId,
        host: socket.id,
        hostSessionId: sessionId || socket.id,
        users: new Map(),
        videoState: {
          videoId: null,
          isPlaying: false,
          currentTime: 0,
          lastUpdate: Date.now()
        },
        queue: []
      });
    } else {
      const room = rooms.get(roomId);

      // Check if this is the returning host
      if (sessionId && room.hostSessionId === sessionId) {
        // Original host is returning - give them back host status
        const oldHost = room.host;
        room.host = socket.id;
        shouldBeHost = true;

        // Remove host status from old host if they exist
        if (oldHost !== socket.id && room.users.has(oldHost)) {
          const oldHostUser = room.users.get(oldHost);
          if (oldHostUser) {
            oldHostUser.isHost = false;
          }
        }
      } else if (room.users.size === 0) {
        // Room exists but is empty (everyone left) - new user becomes host
        room.host = socket.id;
        room.hostSessionId = sessionId || socket.id;
        shouldBeHost = true;
      }
      // Otherwise, they're just a regular viewer
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, {
      id: socket.id,
      username,
      sessionId: sessionId || socket.id,
      isHost: shouldBeHost
    });

    // Store session info
    if (sessionId) {
      userSessions.set(sessionId, { roomId, isHost: shouldBeHost });
    }

    // Calculate current video time if playing
    let adjustedVideoState = { ...room.videoState };
    if (room.videoState.isPlaying && room.videoState.videoId) {
      const timeSinceUpdate = (Date.now() - room.videoState.lastUpdate) / 1000;
      adjustedVideoState.currentTime = room.videoState.currentTime + timeSinceUpdate;
    }

    // Send current room state to new user
    socket.emit('room-state', {
      roomData: {
        id: room.id,
        host: room.host,
        users: Array.from(room.users.values()),
        videoState: adjustedVideoState,
        queue: room.queue
      }
    });

    // Notify others
    socket.to(roomId).emit('user-joined', {
      user: { id: socket.id, username, isHost: shouldBeHost }
    });

    // If host status changed, notify all users
    if (shouldBeHost) {
      io.to(roomId).emit('host-changed', socket.id);
    }
  });

  socket.on('video-state-change', ({ roomId, state }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      room.videoState = { ...room.videoState, ...state, lastUpdate: Date.now() };

      // Rate limit sync broadcasts to prevent lag
      const lastSync = lastSyncTime.get(roomId) || 0;
      const now = Date.now();

      // Only broadcast sync if at least 2 seconds have passed since last sync
      if (now - lastSync > 2000) {
        socket.to(roomId).emit('sync-video', room.videoState);
        lastSyncTime.set(roomId, now);
      }
    }
  });

  socket.on('play-video', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      room.videoState.isPlaying = true;
      room.videoState.lastUpdate = Date.now();
      socket.to(roomId).emit('play');
    }
  });

  socket.on('pause-video', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      room.videoState.isPlaying = false;
      room.videoState.lastUpdate = Date.now();
      socket.to(roomId).emit('pause');
    }
  });

  socket.on('seek-video', ({ roomId, time }) => {
    console.log('Seek request:', { roomId, time, hostId: socket.id });
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      room.videoState.currentTime = time;
      room.videoState.lastUpdate = Date.now();
      console.log('Broadcasting seek to viewers:', time);
      socket.to(roomId).emit('seek', time);
    } else {
      console.log('Seek denied - not host or room not found');
    }
  });

  // Host sends periodic time updates (removed - no longer needed)
  // We'll rely on video-state-change for updates

  socket.on('change-video', ({ roomId, videoId }) => {
    console.log('Change video request:', { roomId, videoId, hostId: socket.id });
    const room = rooms.get(roomId);
    if (room && room.host === socket.id) {
      room.videoState.videoId = videoId;
      room.videoState.currentTime = 0;
      room.videoState.isPlaying = false;
      console.log('Video changed, emitting to room:', roomId, videoId);
      io.to(roomId).emit('video-changed', videoId);
    } else {
      console.log('Video change denied - not host or room not found');
    }
  });

  socket.on('send-message', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (room && room.users.has(socket.id)) {
      const user = room.users.get(socket.id);
      io.to(roomId).emit('new-message', {
        id: Date.now().toString(),
        userId: socket.id,
        username: user.username,
        message,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove user from all rooms
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);

        // If host left, assign new host temporarily but keep original hostSessionId
        if (room.host === socket.id && room.users.size > 0) {
          const newHost = room.users.keys().next().value;
          room.host = newHost;
          const newHostUser = room.users.get(newHost);
          if (newHostUser) {
            newHostUser.isHost = true;
            // DON'T change hostSessionId - keep it for when original host returns
            // room.hostSessionId stays the same!

            // Update session for temporary host
            if (newHostUser.sessionId) {
              userSessions.set(newHostUser.sessionId, { roomId, isHost: true });
            }
          }
          io.to(roomId).emit('host-changed', newHost);
        }

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
          lastSyncTime.delete(roomId); // Clean up sync tracking
        } else {
          io.to(roomId).emit('user-left', socket.id);
        }
      }
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`> WebSocket server ready on port ${PORT}`);
  console.log(`> Accepting connections from: ${CLIENT_URL}`);
});