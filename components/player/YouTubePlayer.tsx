'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket/socket';
import { VideoState } from '@/types';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  roomId: string;
  isHost: boolean;
  videoState: VideoState;
  onVideoStateChange?: (state: Partial<VideoState>) => void;
}

export default function YouTubePlayer({ roomId, isHost, videoState, onVideoStateChange }: YouTubePlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const ignoreNextStateChange = useRef(false);

  console.log('YouTubePlayer render:', { videoState, isHost, isReady });

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsReady(true);
      };
    } else if (window.YT) {
      setIsReady(true);
    }
  }, []);

  // Initialize player
  useEffect(() => {
    if (!isReady || !containerRef.current || !videoState.videoId) return;

    // Create a div element for the player
    const playerDiv = document.createElement('div');
    playerDiv.id = `youtube-player-${roomId}`;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(playerDiv);

    try {
      playerRef.current = new window.YT.Player(playerDiv.id, {
        height: '100%',
        width: '100%',
        videoId: videoState.videoId,
        playerVars: {
          autoplay: 0,
          controls: isHost ? 1 : 0,
          disablekb: 1, // Disable keyboard controls for everyone
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          fs: isHost ? 1 : 0, // Only host can fullscreen
          playsinline: 1,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (event: any) => {
            console.log('YouTube player ready, syncing state:', videoState);
            setIsLoading(false);

            // Sync to current video state
            if (videoState.currentTime > 0) {
              event.target.seekTo(videoState.currentTime, true);
            }

            // Start playing if video was playing
            if (videoState.isPlaying) {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onError: (event: any) => {
            console.error('YouTube player error:', event.data);
            setIsLoading(false);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            if (ignoreNextStateChange.current) {
              ignoreNextStateChange.current = false;
              return;
            }

            if (!isHost) return;

            const socket = getSocket();

            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                socket.emit('play-video', { roomId });
                onVideoStateChange?.({ isPlaying: true });
                break;

              case window.YT.PlayerState.PAUSED:
                socket.emit('pause-video', { roomId });
                onVideoStateChange?.({ isPlaying: false });
                break;
            }
          },
        },
      });
    } catch (error) {
      console.error('Failed to create YouTube player:', error);
      setIsLoading(false);
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, videoState.videoId, roomId, isHost]);

  // Handle remote control events
  useEffect(() => {
    const socket = getSocket();

    const handlePlay = () => {
      console.log('Viewer: Received play command');
      if (playerRef.current && playerRef.current.playVideo) {
        ignoreNextStateChange.current = true;
        playerRef.current.playVideo();
      }
    };

    const handlePause = () => {
      console.log('Viewer: Received pause command');
      if (playerRef.current && playerRef.current.pauseVideo) {
        ignoreNextStateChange.current = true;
        playerRef.current.pauseVideo();
      }
    };

    const handleSeek = (time: number) => {
      console.log('Viewer: Received seek command:', time);
      ignoreNextStateChange.current = true;
      if (playerRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(time, true);
        console.log('Viewer: Seeking to:', time);
      } else {
        console.error('Viewer: Player not ready for seek');
      }
    };

    const handleVideoChange = (videoId: string) => {
      if (playerRef.current) {
        ignoreNextStateChange.current = true;
        playerRef.current.loadVideoById(videoId);
      }
    };

    // Always set up listeners, but only act on them if not host
    socket.on('play', () => {
      if (!isHost) handlePlay();
    });

    socket.on('pause', () => {
      if (!isHost) handlePause();
    });

    socket.on('seek', (time: number) => {
      if (!isHost) {
        console.log('Non-host received seek:', time);
        handleSeek(time);
      }
    });

    socket.on('video-changed', (videoId: string) => {
      if (!isHost) handleVideoChange(videoId);
    });

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('video-changed');
    };
  }, [isHost]);

  // Monitor for seeks and sync time for host
  useEffect(() => {
    if (!isHost) return;

    let previousTime = 0;
    let checkCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let socket: any = null;

    // Try to get socket, handle if not ready
    try {
      socket = getSocket();
    } catch {
      console.log('Socket not ready yet, will retry...');
    }

    const interval = setInterval(() => {
      // Ensure socket is available
      if (!socket) {
        try {
          socket = getSocket();
          console.log('Socket connected!');
        } catch {
          console.log('Still waiting for socket...');
          return;
        }
      }

      if (!playerRef.current) {
        console.log('Host: Player not ready yet');
        return;
      }

      try {
        const currentTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
        const playerState = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
        const isPlaying = playerState === 1; // YT.PlayerState.PLAYING = 1

        console.log(`Host: Check #${checkCount++}`, { currentTime, isPlaying, previousTime });

        // Check for seek (time jump) - only after we have a previous time
        if (previousTime > 0) {
          const timeDiff = Math.abs(currentTime - previousTime);

          // If time jumped more than 2 seconds in 1 second interval, it's a seek
          if (timeDiff > 2) {
            console.log('Host: SEEK DETECTED! Emitting to server...', {
              currentTime,
              previousTime,
              diff: timeDiff,
              roomId
            });

            // Make sure socket emit is working
            const result = socket.emit('seek-video', { roomId, time: currentTime });
            console.log('Emit result:', result);
          }
        }

        // Always update previous time
        previousTime = currentTime;

        // Send periodic updates
        if (currentTime > 0) {
          socket.emit('time-update', { roomId, currentTime });
          socket.emit('video-state-change', {
            roomId,
            state: { currentTime, isPlaying }
          });
        }
      } catch (error) {
        console.error('Host: Error in monitoring:', error);
      }
    }, 1000); // Check every second

    return () => {
      console.log('Host: Stopping monitoring');
      clearInterval(interval);
    };
  }, [isHost, roomId]);


  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white">Loading video...</div>
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Overlay to prevent non-host interactions */}
      {!isHost && !isLoading && (
        <div
          className="absolute inset-0 z-20"
          style={{
            cursor: 'not-allowed',
            pointerEvents: 'all',
            backgroundColor: 'transparent'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded text-sm font-medium shadow-lg">
            🔒 Only the host can control playback
          </div>
        </div>
      )}
    </div>
  );
}