'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { getSocket } from '@/lib/socket/socket';
import { VideoState } from '@/types';
import * as Icons from 'react-feather';

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

const YouTubePlayer = memo(function YouTubePlayer({ roomId, isHost, videoState, onVideoStateChange }: YouTubePlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ignoreNextStateChange = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Remove console log to reduce noise
  // console.log('YouTubePlayer render:', { videoState, isHost, isReady });

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
          disablekb: !isHost ? 1 : 0, // Disable keyboard for viewers only
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          fs: 0, // Disable YouTube's fullscreen (we use custom)
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
        // Also sync the time in case of drift
        if (videoState.currentTime > 0) {
          setTimeout(() => {
            playerRef.current.seekTo(videoState.currentTime, true);
          }, 100);
        }
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
        // Clear any pending sync
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        // Immediate seek
        playerRef.current.seekTo(time, true);

        // Force sync after a short delay to ensure accuracy
        syncTimeoutRef.current = setTimeout(() => {
          if (playerRef.current && playerRef.current.seekTo) {
            playerRef.current.seekTo(time, true);
            console.log('Viewer: Force sync to:', time);
          }
        }, 100);
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

    // Add sync-video listener for viewers
    socket.on('sync-video', (state: VideoState) => {
      if (!isHost && playerRef.current && playerRef.current.seekTo) {
        console.log('Viewer: Syncing to state:', state);
        // Sync time
        if (Math.abs(playerRef.current.getCurrentTime() - state.currentTime) > 1) {
          playerRef.current.seekTo(state.currentTime, true);
        }
        // Sync play state
        if (state.isPlaying && playerRef.current.getPlayerState() !== 1) {
          playerRef.current.playVideo();
        } else if (!state.isPlaying && playerRef.current.getPlayerState() === 1) {
          playerRef.current.pauseVideo();
        }
      }
    });

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('video-changed');
      socket.off('sync-video');
    };
  }, [isHost, videoState.currentTime]);

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

        // Reduce console logging
        if (checkCount++ % 10 === 0) {
          console.log(`Host: Sync check #${checkCount}`, { currentTime, isPlaying });
        }

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

            // Emit seek to server
            socket.emit('seek-video', { roomId, time: currentTime });
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


  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const container = containerRef.current?.parentElement;
      if (container) {
        container.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.error('Error entering fullscreen:', err);
        });
      }
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="relative w-full bg-black rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-white flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <span>Loading video...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Control overlay for all users */}
      {!isLoading && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Fullscreen button for everyone */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-3 bg-black/70 hover:bg-black/90 text-white rounded-lg pointer-events-auto transition-all hover:scale-110 group"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Icons.Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Icons.Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Host/Viewer indicator */}
          <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/80 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shadow-lg flex items-center gap-1.5 sm:gap-2">
            {isHost ? (
              <>
                <Icons.Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                <span className="hidden sm:inline">You have control</span>
                <span className="sm:hidden">Host</span>
              </>
            ) : (
              <>
                <Icons.Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                <span className="hidden sm:inline">Host controls playback</span>
                <span className="sm:hidden">Viewer</span>
              </>
            )}
          </div>

          {/* Click blocker for non-hosts - but not blocking the fullscreen button area */}
          {!isHost && (
            <div
              className="absolute inset-0 pointer-events-auto"
              style={{
                cursor: 'not-allowed',
                clipPath: 'polygon(0 0, calc(100% - 60px) 0, calc(100% - 60px) 60px, 100% 60px, 100% 100%, 0 100%)'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
});

export default YouTubePlayer;