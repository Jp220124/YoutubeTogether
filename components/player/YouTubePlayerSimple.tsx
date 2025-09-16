'use client';

import { useEffect, useRef, useState, memo } from 'react';
import YouTube, { YouTubeEvent, YouTubeProps } from 'react-youtube';
import { getSocket } from '@/lib/socket/socket';
import * as Icons from 'react-feather';

interface YouTubePlayerProps {
  videoId: string | null;
  roomId: string;
  isHost: boolean;
  videoState: {
    videoId: string | null;
    isPlaying: boolean;
    currentTime: number;
  };
}

const YouTubePlayer = memo(function YouTubePlayer({
  videoId,
  roomId,
  isHost,
  videoState
}: YouTubePlayerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const isMobile = useRef(false);
  const isBuffering = useRef(false);
  const lastCommandTime = useRef(0);
  const hasUserInteracted = useRef(false);
  const isMuted = useRef(false);
  const playAttempts = useRef(0);
  const lastPlayTime = useRef(0);
  const lastPauseTime = useRef(0);
  // Removed unused refs - keeping for potential future use
  // const ignoreNextPause = useRef(false);
  // const pauseVerifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeekTime = useRef(0);
  const hasPlayedSuccessfully = useRef(false);
  const consecutivePlayEvents = useRef(0);
  const userInitiatedPause = useRef(false);

  // Detect mobile on mount and track user interactions
  useEffect(() => {
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Track user interactions for autoplay
    const handleUserInteraction = () => {
      hasUserInteracted.current = true;
      // If user clicks while video is paused, mark it as user-initiated
      if (playerRef.current && playerRef.current.getPlayerState && playerRef.current.getPlayerState() === 2) {
        userInitiatedPause.current = true;
        setTimeout(() => {
          userInitiatedPause.current = false;
        }, 1000);
      }
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isHost) {
        userInitiatedPause.current = true;
        setTimeout(() => {
          userInitiatedPause.current = false;
        }, 1000);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // YouTube player options
  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0, // Never autoplay
      controls: isHost ? 1 : 0, // Only host has controls
      fs: 1, // Enable fullscreen for all
      playsinline: 1,
      enablejsapi: 1,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin,
      disablekb: isHost ? 0 : 1, // Disable keyboard for viewers
      mute: 0, // Start unmuted
      start: 0, // Start at beginning
      iv_load_policy: 3, // Hide annotations
    },
  };

  console.log(`[YouTubePlayer] Rendering with videoId: ${videoId}, isHost: ${isHost}`);

  // Initialize player
  const onReady = (event: YouTubeEvent) => {
    console.log(`[onReady] Player ready. IsHost: ${isHost}, VideoId: ${videoId}`);
    playerRef.current = event.target;
    setIsLoading(false);

    // For HOST, cue the video (don't load/play) and show start button
    if (isHost && videoId) {
      console.log('[onReady] Host detected - cueing video without autoplay');
      // Cue video to prevent any autoplay attempts
      event.target.cueVideoById(videoId);
      setNeedsUserGesture(true);
      console.log('[onReady] Showing click to start button for host');
      return;
    }

    // For viewers, sync to current state
    if (!isHost && videoState.videoId) {
      console.log(`[onReady] Viewer detected - syncing to state: playing=${videoState.isPlaying}, time=${videoState.currentTime}`);
      event.target.seekTo(videoState.currentTime, true);
      if (videoState.isPlaying) {
        console.log('[onReady] Attempting muted autoplay for viewer');
        // Try muted autoplay first
        event.target.mute();
        isMuted.current = true;
        event.target.playVideo().then(() => {
          console.log('[onReady] Viewer autoplay successful');
          // Unmute after successful play
          setTimeout(() => {
            if (playerRef.current && isMuted.current) {
              playerRef.current.unMute();
              isMuted.current = false;
            }
          }, 500);
        }).catch((error: any) => {
          console.log('[onReady] Viewer autoplay failed:', error);
          // Need user gesture
          setNeedsUserGesture(true);
        });
      }
    }
  };

  // Handle state changes - HOST ONLY broadcasts
  const onStateChange = (event: YouTubeEvent) => {
    const state = event.data;
    const stateNames: { [key: number]: string } = {
      '-1': 'UNSTARTED',
      '0': 'ENDED',
      '1': 'PLAYING',
      '2': 'PAUSED',
      '3': 'BUFFERING',
      '5': 'VIDEO_CUED'
    };

    const currentTime = playerRef.current?.getCurrentTime() || 0;
    console.log(`[onStateChange] ${stateNames[state] || state} at ${currentTime.toFixed(3)}s | Host: ${isHost} | HasPlayed: ${hasPlayedSuccessfully.current} | ConsecutivePlays: ${consecutivePlayEvents.current}`);

    // Only host should handle state changes
    if (!isHost || !playerRef.current) {
      console.log('[onStateChange] Skipping - not host or no player');
      return;
    }

    const socket = getSocket();
    const now = Date.now();

    // Detect buffering
    if (state === 3) { // Buffering
      console.log('[onStateChange] Buffering detected');
      isBuffering.current = true;
      return;
    } else {
      isBuffering.current = false;
    }

    // For unstarted state, don't broadcast
    if (state === -1 || state === 5) { // unstarted or video cued
      console.log('[onStateChange] Unstarted/Cued - resetting state');
      hasPlayedSuccessfully.current = false;
      consecutivePlayEvents.current = 0;
      return;
    }

    // Broadcast state changes with strict filtering
    switch (state) {
      case 1: // Playing
        consecutivePlayEvents.current++;
        console.log(`[onStateChange] PLAYING event #${consecutivePlayEvents.current}`);

        // Consider video as successfully playing after 2 consecutive play events
        // (reduced from 3 since we're now using manual start)
        if (consecutivePlayEvents.current >= 2) {
          if (!hasPlayedSuccessfully.current) {
            console.log('[onStateChange] ✅ Video is now successfully playing!');
          }
          hasPlayedSuccessfully.current = true;
        }

        lastPlayTime.current = now;
        userInitiatedPause.current = false; // Reset pause flag

        // Ensure we're unmuted when playing
        if (isMuted.current && playerRef.current) {
          console.log('[onStateChange] Unmuting video');
          playerRef.current.unMute();
          isMuted.current = false;
        }

        console.log(`[onStateChange] Emitting PLAYING to server at position ${currentTime}`);
        socket.emit('host-state-change', {
          roomId,
          state: 'playing',
          position: currentTime,
          timestamp: now
        });
        break;

      case 2: // Paused
        console.log(`[onStateChange] PAUSED event at ${currentTime}`);

        // CRITICAL: Only broadcast pause if video has been successfully playing
        if (!hasPlayedSuccessfully.current) {
          console.log('[onStateChange] ❌ IGNORING PAUSE - video never played successfully');
          console.log(`[onStateChange] Play attempts: ${playAttempts.current}`);

          // If we're getting pause events without successful play, likely autoplay issue
          playAttempts.current++;
          if (playAttempts.current > 3 && currentTime < 1) {
            console.log('[onStateChange] Too many failed attempts - showing click to start');
            setNeedsUserGesture(true);
            playAttempts.current = 0;
          }
          return;
        }

        const timeSincePlay = now - lastPlayTime.current;
        console.log(`[onStateChange] Time since last play: ${timeSincePlay}ms`);

        // Only broadcast pause if enough time has passed since last play
        // This filters out the pause events that happen during buffering
        if (timeSincePlay < 2000) {
          console.log('[onStateChange] ❌ IGNORING PAUSE - too soon after play');
          return;
        }

        // Check if this might be a user-initiated pause
        // User pauses typically happen after the video has been playing for a while
        const isLikelyUserPause = currentTime > 2 && hasPlayedSuccessfully.current;
        console.log(`[onStateChange] User pause check: time=${currentTime}, likely=${isLikelyUserPause}, flagged=${userInitiatedPause.current}`);

        if (!isLikelyUserPause && !userInitiatedPause.current) {
          console.log('[onStateChange] ❌ IGNORING PAUSE - not user initiated');
          return;
        }

        console.log('[onStateChange] ✅ Broadcasting PAUSE to server');
        consecutivePlayEvents.current = 0; // Reset play counter
        lastPauseTime.current = now;

        socket.emit('host-state-change', {
          roomId,
          state: 'paused',
          position: currentTime,
          timestamp: now
        });
        break;
    }
  };

  // Handle host seek detection
  useEffect(() => {
    if (!isHost || !playerRef.current) {
      console.log('[Seek Detection] Not host or no player - skipping');
      return;
    }

    console.log('[Seek Detection] Setting up seek detection for host');
    let lastPosition = 0;
    const interval = setInterval(() => {
      if (!playerRef.current || isBuffering.current) return;

      const currentPosition = playerRef.current.getCurrentTime();

      // Detect seeks (>2 second jump)
      if (Math.abs(currentPosition - lastPosition) > 2) {
        const socket = getSocket();
        lastSeekTime.current = Date.now();
        lastCommandTime.current = lastSeekTime.current;
        socket.emit('host-state-change', {
          roomId,
          state: 'seek',
          position: currentPosition,
          timestamp: Date.now()
        });
      }

      // Track play attempts for autoplay detection
      if (currentPosition < 0.5 && playerRef.current.getPlayerState() !== 1) {
        playAttempts.current++;
      }

      lastPosition = currentPosition;
    }, 500);

    return () => clearInterval(interval);
  }, [isHost, roomId]);

  // VIEWER: Listen for state broadcasts
  useEffect(() => {
    if (isHost) {
      console.log('[useEffect] Host mode - not listening for state changes');
      return;
    }

    console.log('[useEffect] Viewer mode - setting up state change listeners');
    const socket = getSocket();

    const handleStateChange = (data: {
      state: string;
      position: number;
      timestamp: number
    }) => {
      if (!playerRef.current) return;

      // Debounce rapid updates
      const now = Date.now();
      if (now - lastCommandTime.current < 200) return;
      lastCommandTime.current = now;

      // Apply state immediately without calculations
      switch (data.state) {
        case 'playing':
          playerRef.current.seekTo(data.position, true);

          // Try to play with different strategies
          const tryPlay = async () => {
            try {
              // First try: direct play if user has interacted
              if (hasUserInteracted.current) {
                await playerRef.current.playVideo();
              } else {
                // Second try: muted autoplay
                playerRef.current.mute();
                isMuted.current = true;
                await playerRef.current.playVideo();

                // Unmute after successful play
                setTimeout(() => {
                  if (playerRef.current && isMuted.current) {
                    playerRef.current.unMute();
                    isMuted.current = false;
                  }
                }, 500);
              }
            } catch (error) {
              console.log('Playback failed, need user gesture');
              setNeedsUserGesture(true);
            }
          };

          tryPlay();
          break;
        case 'paused':
          playerRef.current.pauseVideo();
          playerRef.current.seekTo(data.position, true);
          break;
        case 'seek':
          playerRef.current.seekTo(data.position, true);
          break;
      }
    };

    const handleVideoChange = (videoId: string) => {
      console.log(`[handleVideoChange] Video changed to: ${videoId}, isHost: ${isHost}`);

      if (playerRef.current) {
        // Reset all state tracking when video changes
        console.log('[handleVideoChange] Resetting all state tracking');
        hasPlayedSuccessfully.current = false;
        consecutivePlayEvents.current = 0;
        userInitiatedPause.current = false;
        playAttempts.current = 0;

        // For host, always require click to start new video
        if (isHost) {
          console.log('[handleVideoChange] HOST - Using cueVideoById to prevent autoplay');
          setNeedsUserGesture(true);
          // Use cueVideoById instead of loadVideoById to prevent autoplay
          playerRef.current.cueVideoById(videoId);
        } else {
          console.log('[handleVideoChange] VIEWER - Using loadVideoById');
          playerRef.current.loadVideoById(videoId);
        }
      }
    };

    socket.on('state-changed', handleStateChange);
    socket.on('video-changed', handleVideoChange);

    return () => {
      socket.off('state-changed');
      socket.off('video-changed');
    };
  }, [isHost]);

  // Handle user gesture to start playback
  const handleUserStart = async () => {
    console.log('[handleUserStart] User clicked to start video');

    if (!playerRef.current) {
      console.log('[handleUserStart] No player ref - aborting');
      return;
    }

    hasUserInteracted.current = true;
    playAttempts.current = 0;
    hasPlayedSuccessfully.current = false;
    consecutivePlayEvents.current = 0;

    try {
      // For host, play and mark as starting fresh
      if (isHost) {
        console.log('[handleUserStart] HOST - Starting video playback');
        // Reset state for clean start
        hasPlayedSuccessfully.current = false;
        consecutivePlayEvents.current = 0;

        await playerRef.current.playVideo();
        console.log('[handleUserStart] Play command sent successfully');
        setNeedsUserGesture(false);
        return;
      }

      // For viewers, sync to current position
      if (videoState.currentTime) {
        playerRef.current.seekTo(videoState.currentTime, true);
      }

      // Try playing with mute first if needed
      try {
        await playerRef.current.playVideo();
      } catch (error) {
        // Fallback to muted play
        playerRef.current.mute();
        isMuted.current = true;
        await playerRef.current.playVideo();

        // Unmute after successful play
        setTimeout(() => {
          if (playerRef.current && isMuted.current) {
            playerRef.current.unMute();
            isMuted.current = false;
          }
        }, 500);
      }

      setNeedsUserGesture(false);
    } catch (error: any) {
      console.error('Failed to start playback:', error);
    }
  };

  // Fullscreen handler
  const toggleFullscreen = () => {
    const elem = containerRef.current?.parentElement;
    if (!document.fullscreenElement && elem) {
      elem.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden"
    >
      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={(e) => console.error('YouTube error:', e)}
          onPlay={() => console.log('[YouTube] onPlay event fired')}
          onPause={() => console.log('[YouTube] onPause event fired')}
          className="w-full h-full"
          iframeClassName="w-full h-full"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400">No video selected</p>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && videoId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* User gesture required to start */}
      {needsUserGesture && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-40">
          <button
            onClick={handleUserStart}
            className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-full transition-all transform hover:scale-110"
          >
            <Icons.Play className="w-12 h-12" fill="white" />
          </button>
          <p className="mt-4 text-white text-lg">
            {isHost ? 'Click to start video' : 'Click to sync with host'}
          </p>
          {isMuted.current && (
            <p className="mt-2 text-white/70 text-sm">Video will start muted</p>
          )}
        </div>
      )}

      {/* Simple status indicator */}
      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs z-20">
        {isHost ? (
          <span className="flex items-center gap-1">
            <Icons.Award className="w-3 h-3 text-yellow-400" />
            Host
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Icons.Users className="w-3 h-3" />
            Viewer
          </span>
        )}
      </div>

      {/* Viewer controls overlay */}
      {!isHost && !needsUserGesture && videoId && (
        <div
          className="absolute inset-0 z-10"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}

      {/* Fullscreen button for desktop */}
      {!isMobile.current && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 bg-black/60 text-white p-2 rounded hover:bg-black/80"
        >
          {isFullscreen ? (
            <Icons.Minimize className="w-4 h-4" />
          ) : (
            <Icons.Maximize className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
});

export default YouTubePlayer;
