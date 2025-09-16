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

  // Detect mobile on mount and track user interactions
  useEffect(() => {
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Track user interactions for autoplay
    const handleUserInteraction = () => {
      hasUserInteracted.current = true;
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
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
    },
  };

  // Initialize player
  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsLoading(false);

    // For viewers, sync to current state
    if (!isHost && videoState.videoId) {
      event.target.seekTo(videoState.currentTime, true);
      if (videoState.isPlaying) {
        // Try muted autoplay first
        event.target.mute();
        isMuted.current = true;
        event.target.playVideo().then(() => {
          // Unmute after successful play
          setTimeout(() => {
            if (playerRef.current && isMuted.current) {
              playerRef.current.unMute();
              isMuted.current = false;
            }
          }, 500);
        }).catch(() => {
          // Need user gesture
          setNeedsUserGesture(true);
        });
      }
    }
  };

  // Handle state changes - HOST ONLY broadcasts
  const onStateChange = (event: YouTubeEvent) => {
    // Only host should handle state changes
    if (!isHost || !playerRef.current) return;

    const socket = getSocket();
    const state = event.data;
    const currentTime = playerRef.current.getCurrentTime();

    // Detect buffering
    if (state === 3) { // Buffering
      isBuffering.current = true;
      return;
    } else {
      isBuffering.current = false;
    }

    // For unstarted state, don't broadcast
    if (state === -1 || state === 5) { // unstarted or video cued
      // If video is cued and host tries to play but fails
      if (state === 5 && playAttempts.current > 0) {
        // Host needs to click to start
        setNeedsUserGesture(true);
        playAttempts.current = 0;
      }
      return;
    }

    // Broadcast state changes
    switch (state) {
      case 1: // Playing
        playAttempts.current = 0; // Reset attempts on successful play
        // Ensure we're unmuted when playing
        if (isMuted.current && playerRef.current) {
          playerRef.current.unMute();
          isMuted.current = false;
        }
        socket.emit('host-state-change', {
          roomId,
          state: 'playing',
          position: currentTime,
          timestamp: Date.now()
        });
        break;
      case 2: // Paused
        // Check if this pause happened immediately after trying to play
        if (currentTime < 1 && playAttempts.current > 0) {
          playAttempts.current++;
          // If multiple failed attempts, show click to start
          if (playAttempts.current > 2) {
            setNeedsUserGesture(true);
            playAttempts.current = 0;
          }
        }
        socket.emit('host-state-change', {
          roomId,
          state: 'paused',
          position: currentTime,
          timestamp: Date.now()
        });
        break;
    }
  };

  // Handle host seek detection
  useEffect(() => {
    if (!isHost || !playerRef.current) return;

    let lastPosition = 0;
    const interval = setInterval(() => {
      if (!playerRef.current || isBuffering.current) return;

      const currentPosition = playerRef.current.getCurrentTime();

      // Detect seeks (>2 second jump)
      if (Math.abs(currentPosition - lastPosition) > 2) {
        const socket = getSocket();
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
    if (isHost) return;

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
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
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
    if (!playerRef.current) return;

    hasUserInteracted.current = true;
    playAttempts.current = 0;

    try {
      // For host, just play directly
      if (isHost) {
        await playerRef.current.playVideo();
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
    } catch (error) {
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
          onStateChange={isHost ? onStateChange : undefined}
          onError={(e) => console.error('YouTube error:', e)}
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