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

  // Detect mobile on mount
  useEffect(() => {
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  // YouTube player options
  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0, // Never autoplay
      controls: 1, // Always show controls
      fs: 1, // Enable fullscreen for all
      playsinline: 1,
      enablejsapi: 1,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin,
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
        event.target.playVideo().catch(() => {
          // Need user gesture on mobile
          if (isMobile.current) {
            setNeedsUserGesture(true);
          }
        });
      }
    }
  };

  // Handle state changes - HOST ONLY broadcasts
  const onStateChange = (event: YouTubeEvent) => {
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

    // Broadcast state changes
    switch (state) {
      case 1: // Playing
        socket.emit('host-state-change', {
          roomId,
          state: 'playing',
          position: currentTime,
          timestamp: Date.now()
        });
        break;
      case 2: // Paused
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
          playerRef.current.playVideo();
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

  // Mobile tap to start
  const handleMobileStart = () => {
    if (playerRef.current) {
      playerRef.current.playVideo();
      setNeedsUserGesture(false);
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
          className="absolute inset-0 w-full h-full"
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

      {/* Mobile tap to start */}
      {needsUserGesture && !isHost && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-40">
          <button
            onClick={handleMobileStart}
            className="bg-red-600 hover:bg-red-700 text-white p-6 rounded-full"
          >
            <Icons.Play className="w-12 h-12" fill="white" />
          </button>
          <p className="absolute bottom-8 text-white">Tap to start</p>
        </div>
      )}

      {/* Simple status indicator */}
      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
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