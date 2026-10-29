import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface YouTubePlayerProps {
  videoId: string;
  youtubeVideoId: string;
  initialTimeSeconds?: number;
  durationSeconds?: number;
  title?: string;
  onPlaybackProgress?: (currentSeconds: number, durationSeconds: number) => void;
  onHistorySaved?: () => void;
}

interface YoutubeApiPlayer {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
}

interface YoutubeApiEvent {
  target: YoutubeApiPlayer;
}

interface YoutubeApi {
  Player: new (
    elementId: string,
    options: {
      host: string;
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: (event: YoutubeApiEvent) => void;
        onStateChange: (event: YoutubeApiEvent & { data: number }) => void;
        onError: () => void;
      };
    }
  ) => YoutubeApiPlayer;
}

declare global {
  interface Window {
    YT?: YoutubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YoutubeApi> | undefined;

const HISTORY_RETRY_DELAYS_MS = [1000, 2000, 4000, 6000, 8000];

const loadYouTubeApi = (): Promise<YoutubeApi> => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  const previousReady = window.onYouTubeIframeAPIReady;
  let script = document.querySelector<HTMLScriptElement>('script[data-youtube-iframe-api]');
  let settled = false;
  let resolveLoad: (api: YoutubeApi) => void;

  const resetLoadingState = () => {
    if (window.onYouTubeIframeAPIReady === onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = previousReady;
    }
  };

  const onYouTubeIframeAPIReady = () => {
    previousReady?.();
    if (!settled && window.YT?.Player) {
      settled = true;
      resolveLoad(window.YT);
      resetLoadingState();
    }
  };

  youtubeApiPromise = new Promise<YoutubeApi>((resolve, reject) => {
    resolveLoad = resolve;

    const rejectLoad = () => {
      if (settled) return;
      settled = true;
      script?.remove();
      resetLoadingState();
      youtubeApiPromise = undefined;
      reject(new Error('YouTube player API could not be loaded.'));
    };

    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeIframeApi = 'true';
      document.head.appendChild(script);
    }
    script.addEventListener('error', rejectLoad, { once: true });
  });

  return youtubeApiPromise;
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  youtubeVideoId,
  initialTimeSeconds = 0,
  durationSeconds = 0,
  title = 'Video Player',
  onPlaybackProgress,
  onHistorySaved,
}) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerMountIdRef = useRef(`youtube-player-${videoId}-${Math.random().toString(36).slice(2)}`);
  const onPlaybackProgressRef = useRef(onPlaybackProgress);
  const onHistorySavedRef = useRef(onHistorySaved);
  const showToastRef = useRef(showToast);
  const authStateRef = useRef({ user, isAuthLoading });
  const playerRef = useRef<YoutubeApiPlayer | null>(null);
  const isPlayingRef = useRef(false);
  const qualifyingSecondsRef = useRef(0);
  const lastSampleRef = useRef<{ time: number; wallTime: number } | null>(null);
  const historySavedRef = useRef(false);
  const historyAttemptRef = useRef(false);
  const historyRetryRef = useRef({ attempts: 0, nextAttemptAt: 0 });
  const unauthenticatedPromptRef = useRef(false);
  const lastCheckpointRef = useRef(initialTimeSeconds);

  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [playerError, setPlayerError] = useState('');

  onPlaybackProgressRef.current = onPlaybackProgress;
  onHistorySavedRef.current = onHistorySaved;
  showToastRef.current = showToast;
  authStateRef.current = { user, isAuthLoading };

  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;
    setIsLoading(true);
    setHasError(false);
    setPlayerError('');
    historySavedRef.current = false;
    historyAttemptRef.current = false;
    historyRetryRef.current = { attempts: 0, nextAttemptAt: 0 };
    qualifyingSecondsRef.current = 0;
    lastCheckpointRef.current = initialTimeSeconds;

    const saveCheckpoint = async (seconds: number, totalDuration: number, thresholdReached = false) => {
      const authState = authStateRef.current;
      if (!authState.user || authState.isAuthLoading || seconds < 5) return;
      const now = performance.now();
      if (historyAttemptRef.current || now < historyRetryRef.current.nextAttemptAt) return;
      if (historyRetryRef.current.attempts >= HISTORY_RETRY_DELAYS_MS.length) {
        historyRetryRef.current = { attempts: 0, nextAttemptAt: 0 };
      }
      historyAttemptRef.current = true;
      try {
        await api.post('/api/history/progress', {
          videoId,
          youtubeVideoId,
          positionSeconds: Math.floor(seconds),
          durationSeconds: Math.floor(totalDuration || durationSeconds),
        });
        if (!cancelled) {
          historyAttemptRef.current = false;
          historyRetryRef.current = { attempts: 0, nextAttemptAt: 0 };
          historySavedRef.current = true;
          lastCheckpointRef.current = seconds;
          if (thresholdReached) onHistorySavedRef.current?.();
        }
      } catch (error) {
        historyAttemptRef.current = false;
        const retryCount = Math.min(historyRetryRef.current.attempts + 1, HISTORY_RETRY_DELAYS_MS.length);
        historyRetryRef.current = {
          attempts: retryCount,
          nextAttemptAt: performance.now() + HISTORY_RETRY_DELAYS_MS[retryCount - 1],
        };
        console.warn('[YouTubePlayer] Failed to save playback checkpoint:', error);
      }
    };

    loadYouTubeApi()
      .then((YoutubeApi) => {
        if (cancelled || !playerContainerRef.current) return;
        const mountElement = document.createElement('div');
        mountElement.id = playerMountIdRef.current;
        mountElement.className = 'w-full h-full';
        mountElement.title = title;
        playerContainerRef.current.appendChild(mountElement);

        playerRef.current = new YoutubeApi.Player(mountElement.id, {
          host: 'https://www.youtube-nocookie.com',
          videoId: youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            start: initialTimeSeconds > 5 ? Math.floor(initialTimeSeconds) : 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              setIsLoading(false);
              const duration = event.target.getDuration();
              onPlaybackProgressRef.current?.(initialTimeSeconds, duration || durationSeconds);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === 1) {
                isPlayingRef.current = true;
                lastSampleRef.current = null;
              } else {
                isPlayingRef.current = false;
                lastSampleRef.current = null;
              }
            },
            onError: () => {
              if (cancelled) return;
              setIsLoading(false);
              setPlayerError('The video owner has disabled embedding or the player could not start this video.');
              setHasError(true);
            },
          },
        });

        interval = window.setInterval(() => {
          if (cancelled || !isPlayingRef.current || !playerRef.current) return;
          const now = performance.now();
          const seconds = Math.max(0, playerRef.current.getCurrentTime());
          const totalDuration = playerRef.current.getDuration() || durationSeconds;
          const previous = lastSampleRef.current;
          const wallElapsed = previous ? Math.max(0, (now - previous.wallTime) / 1000) : 0;

          if (previous && wallElapsed > 0) {
            const playbackAdvance = seconds - previous.time;
            if (playbackAdvance >= -0.25 && playbackAdvance <= wallElapsed + 1.25) {
              qualifyingSecondsRef.current += Math.min(wallElapsed, Math.max(0, playbackAdvance));
            }
          }
          lastSampleRef.current = { time: seconds, wallTime: now };
          onPlaybackProgressRef.current?.(seconds, totalDuration);

          if (!historySavedRef.current && qualifyingSecondsRef.current >= 5) {
            void saveCheckpoint(seconds, totalDuration, true);
          } else if (historySavedRef.current && seconds - lastCheckpointRef.current >= 4) {
            void saveCheckpoint(seconds, totalDuration);
          }

          if (!authStateRef.current.user && !unauthenticatedPromptRef.current) {
            unauthenticatedPromptRef.current = true;
            showToastRef.current('Sign in to save watched videos to your history.', 'info');
          }
        }, 250);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setIsLoading(false);
        setPlayerError(error instanceof Error ? error.message : 'YouTube playback could not be initialized.');
        setHasError(true);
      });

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      playerRef.current?.destroy();
      playerRef.current = null;
      playerContainerRef.current?.querySelectorAll('[id]').forEach((element) => element.remove());
    };
  }, [videoId, youtubeVideoId, initialTimeSeconds, durationSeconds, retryCount]);

  return (
    <div className="relative w-full aspect-video rounded-2xl bg-black overflow-hidden shadow-2xl shadow-black/80 border border-slate-800">
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
          <p className="text-xs font-mono tracking-wider uppercase text-slate-400">Initializing YouTube player…</p>
        </div>
      )}

      <div ref={playerContainerRef} className="w-full h-full" />

      {hasError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
      <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="max-w-md space-y-2">
      <h3 className="text-lg font-bold text-white">Playback unavailable</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{playerError}</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
      <a
        href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition-all"
      >
        Watch on YouTube
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button
        type="button"
        onClick={() => setRetryCount((count) => count + 1)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
          </div>
        </div>
      )}
    </div>
  );
};
