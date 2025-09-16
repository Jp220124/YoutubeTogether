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
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false); // Track if video has started once
  const ignoreNextStateChange = useRef(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTime = useRef(0);
  const playStartTime = useRef(0);
  const playStartPosition = useRef(0);
  const isMobile = useRef(false);

  // Remove console log to reduce noise
  // console.log('YouTubePlayer render:', { videoState, isHost, isReady });

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Detect if mobile
      const userAgent = navigator.userAgent.toLowerCase();
      isMobile.current = /mobile|android|iphone|ipad|ipod/.test(userAgent);

      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          setIsReady(true);
        };
      } else {
        setIsReady(true);
      }
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
          controls: isHost ? 1 : (isMobile.current && !hasStartedOnce ? 1 : 0), // Show controls for first play on mobile
          disablekb: !isHost ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          fs: isMobile.current && isHost ? 1 : 0, // Only enable fullscreen for mobile host
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          mute: 0
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (event: any) => {
            console.log('YouTube player ready, syncing state:', videoState);
            setIsLoading(false);

            // Ensure iframe has proper fullscreen attributes for iOS
            const iframe = event.target.getIframe();
            if (iframe) {
              iframe.setAttribute('allowfullscreen', 'true');
              iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
            }

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

            // For non-hosts on mobile, detect state changes
            if (!isHost && isMobile.current) {
              // If this is the first play, mark it and hide controls
              if (event.data === window.YT.PlayerState.PLAYING && !hasStartedOnce) {
                console.log('Mobile viewer started video for first time');
                setHasStartedOnce(true);
                setNeedsUserGesture(false);

                // Hide controls after first play
                setTimeout(() => {
                  if (event.target && event.target.setOption) {
                    // Try to disable controls programmatically
                    try {
                      const iframe = event.target.getIframe();
                      if (iframe) {
                        // Reload player without controls
                        const videoId = event.target.getVideoData().video_id;
                        const currentTime = event.target.getCurrentTime();
                        event.target.loadVideoById({
                          videoId: videoId,
                          startSeconds: currentTime
                        });
                      }
                    } catch (e) {
                      console.log('Could not disable controls:', e);
                    }
                  }
                }, 100);
              }

              // After first play, detect manual interactions
              if (hasStartedOnce) {
                const currentTime = event.target.getCurrentTime();
                const expectedTime = playStartPosition.current + ((Date.now() - playStartTime.current) / 1000);

                // If viewer is more than 1 second out of sync, they've manually seeked
                if (Math.abs(currentTime - expectedTime) > 1) {
                  console.log('Mobile viewer manually seeked, resyncing...');
                  // Force resync to host position
                  event.target.seekTo(expectedTime, true);
                  return;
                }
              }
            }

            if (!isHost) return;

            const socket = getSocket();

            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                // Record when playback started for timestamp sync
                playStartTime.current = Date.now();
                playStartPosition.current = event.target.getCurrentTime();

                socket.emit('play-video', {
                  roomId,
                  timestamp: playStartTime.current,
                  position: playStartPosition.current
                });
                onVideoStateChange?.({ isPlaying: true });
                break;

              case window.YT.PlayerState.PAUSED:
                socket.emit('pause-video', {
                  roomId,
                  position: event.target.getCurrentTime()
                });
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

  // Handle remote control events with timestamp-based sync
  useEffect(() => {
    const socket = getSocket();

    const handlePlay = (data: { timestamp: number; position: number }) => {
      console.log('Viewer: Received play command with timestamp sync');
      if (playerRef.current && playerRef.current.playVideo) {
        ignoreNextStateChange.current = true;

        // Calculate where the video should be based on timestamp
        const elapsed = (Date.now() - data.timestamp) / 1000;
        const targetPosition = data.position + elapsed;

        playerRef.current.seekTo(targetPosition, true);

        // Store sync reference
        playStartTime.current = data.timestamp;
        playStartPosition.current = data.position;

        // Try to play
        try {
          playerRef.current.playVideo();
        } catch (e) {
          console.log('Play failed, need user gesture');
          // On mobile, if autoplay fails, we need user gesture
          if (isMobile.current && !isHost) {
            setPendingPlay(true);
            setNeedsUserGesture(true);
          }
        }
      }
    };

    const handlePause = (data: { position: number }) => {
      console.log('Viewer: Received pause command');
      if (playerRef.current && playerRef.current.pauseVideo) {
        ignoreNextStateChange.current = true;
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(data.position, true);
      }
    };

    const handleSeek = (time: number) => {
      console.log('Viewer: Received seek command:', time);
      if (playerRef.current && playerRef.current.seekTo) {
        ignoreNextStateChange.current = true;
        playerRef.current.seekTo(time, true);

        // Update sync reference
        playStartTime.current = Date.now();
        playStartPosition.current = time;
      }
    };

    const handleVideoChange = (videoId: string) => {
      if (playerRef.current) {
        ignoreNextStateChange.current = true;
        playerRef.current.loadVideoById(videoId);
      }
    };

    // Always set up listeners, but only act on them if not host
    socket.on('play', (data) => {
      if (!isHost) handlePlay(data);
    });

    socket.on('pause', (data) => {
      if (!isHost) handlePause(data);
    });

    socket.on('seek', (time: number) => {
      if (!isHost) handleSeek(time);
    });

    socket.on('video-changed', (videoId: string) => {
      if (!isHost) handleVideoChange(videoId);
    });

    // Remove the old sync-video listener - we'll use a better approach

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('video-changed');
    };
  }, [isHost, videoState.currentTime]);

  // New improved sync mechanism using playback rate adjustment
  useEffect(() => {
    if (!isHost || !playerRef.current) return;

    let previousTime = 0;
    const socket = getSocket();

    const checkForSeek = setInterval(() => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;

      const currentTime = playerRef.current.getCurrentTime();

      // Detect manual seeks (more than 2 seconds jump)
      if (previousTime > 0 && Math.abs(currentTime - previousTime) > 2) {
        console.log('Host: Seek detected, broadcasting...');
        socket.emit('seek-video', { roomId, time: currentTime });

        // Update sync reference
        playStartTime.current = Date.now();
        playStartPosition.current = currentTime;
      }

      previousTime = currentTime;
    }, 500); // Check every 500ms for responsive seek detection

    return () => clearInterval(checkForSeek);
  }, [isHost, roomId]);

  // Viewer sync using playback rate adjustment (smooth catch-up)
  useEffect(() => {
    if (isHost || !playerRef.current) return;

    const syncWithHost = () => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;
      if (playStartTime.current === 0) return; // No sync reference yet

      const player = playerRef.current;
      const playerState = player.getPlayerState();

      // Only sync when playing
      if (playerState !== 1) return;

      const currentTime = player.getCurrentTime();
      const elapsed = (Date.now() - playStartTime.current) / 1000;
      const expectedPosition = playStartPosition.current + elapsed;
      const drift = currentTime - expectedPosition;

      // Adjust playback rate to smoothly sync (skip on mobile for performance)
      if (!isMobile.current && Math.abs(drift) > 0.2) {
        if (drift > 0) {
          // We're ahead, slow down
          player.setPlaybackRate(0.9);
          setTimeout(() => {
            if (player.setPlaybackRate) player.setPlaybackRate(1.0);
          }, Math.abs(drift) * 1000);
        } else {
          // We're behind, speed up
          player.setPlaybackRate(1.1);
          setTimeout(() => {
            if (player.setPlaybackRate) player.setPlaybackRate(1.0);
          }, Math.abs(drift) * 1000);
        }
        console.log(`Viewer: Adjusting sync, drift: ${drift.toFixed(2)}s`);
      } else if (isMobile.current && Math.abs(drift) > 1) {
        // On mobile, aggressively resync if drift is more than 1 second
        ignoreNextStateChange.current = true;
        player.seekTo(expectedPosition, true);
        console.log(`Mobile: Force resync, drift: ${drift.toFixed(2)}s`);
      }
    };

    // Run sync check every 2 seconds
    const syncInterval = setInterval(syncWithHost, 2000);

    return () => clearInterval(syncInterval);
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

  // Handle mobile play button click
  const handleMobilePlay = () => {
    if (playerRef.current && pendingPlay) {
      playerRef.current.playVideo();
      setNeedsUserGesture(false);
      setPendingPlay(false);
      setHasStartedOnce(true);
    }
  };

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

      {/* Mobile Play Button Overlay - Shows when user gesture needed */}
      {needsUserGesture && !isHost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
          <button
            onClick={handleMobilePlay}
            className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-full shadow-2xl transform hover:scale-110 transition-all"
          >
            <Icons.Play className="w-12 h-12" fill="white" />
          </button>
          <div className="absolute bottom-8 text-white text-center px-4">
            <p className="text-sm font-medium">Tap to sync with host</p>
          </div>
        </div>
      )}

      {/* Mobile viewer overlay - Only show AFTER first play */}
      {!isHost && isMobile.current && !isLoading && !needsUserGesture && hasStartedOnce && (
        <div className="absolute inset-0 z-25 pointer-events-none">
          <div
            className="absolute inset-0 pointer-events-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-xs font-medium">
              <Icons.Lock className="inline w-3 h-3 mr-1" />
              Only host can control playback
            </div>
          </div>
        </div>
      )}

      {/* Control overlay for all users */}
      {!isLoading && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Fullscreen button for desktop only (mobile uses native YouTube fullscreen) */}
          {!isMobile.current && (
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
          )}

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

          {/* Click blocker for non-hosts - disabled on mobile to allow native controls */}
          {!isHost && !isMobile.current && (
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