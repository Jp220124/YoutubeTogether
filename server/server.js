const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Room management
const rooms = new Map();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, username }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          host: socket.id,
          users: new Map(),
          videoState: {
            videoId: null,
            isPlaying: false,
            currentTime: 0,
            lastUpdate: Date.now()
          },
          queue: []
        });
      }

      const room = rooms.get(roomId);
      room.users.set(socket.id, { id: socket.id, username, isHost: room.host === socket.id });

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
        user: { id: socket.id, username, isHost: false }
      });
    });

    socket.on('video-state-change', ({ roomId, state }) => {
      const room = rooms.get(roomId);
      if (room && room.host === socket.id) {
        room.videoState = { ...room.videoState, ...state, lastUpdate: Date.now() };
        socket.to(roomId).emit('sync-video', room.videoState);
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

    // Host sends periodic time updates
    socket.on('time-update', ({ roomId, currentTime }) => {
      const room = rooms.get(roomId);
      if (room && room.host === socket.id) {
        room.videoState.currentTime = currentTime;
        room.videoState.lastUpdate = Date.now();
      }
    });

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

          // If host left, assign new host
          if (room.host === socket.id && room.users.size > 0) {
            const newHost = room.users.keys().next().value;
            room.host = newHost;
            io.to(roomId).emit('host-changed', newHost);
          }

          // Clean up empty rooms
          if (room.users.size === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit('user-left', socket.id);
          }
        }
      });
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});