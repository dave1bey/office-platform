import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSessionTimeoutProps {
  enabled: boolean;
  onTimeout: () => void;
  defaultMinutes?: number;
}

export function useSessionTimeout({
  enabled,
  onTimeout,
  defaultMinutes = 10
}: UseSessionTimeoutProps) {
  // Load saved session timeout duration from localStorage or default (10 minutes)
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('user_session_timeout_minutes');
    return saved ? parseInt(saved, 10) : defaultMinutes;
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(timeoutMinutes * 60);
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const warningThresholdSeconds = 60; // Show warning when 60s remaining

  const changeTimeoutDuration = (minutes: number) => {
    setTimeoutMinutes(minutes);
    localStorage.setItem('user_session_timeout_minutes', String(minutes));
    lastActivityRef.current = Date.now();
    localStorage.setItem('last_active_timestamp', String(Date.now()));
    setRemainingSeconds(minutes * 60);
    setShowWarning(false);
  };

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    localStorage.setItem('last_active_timestamp', String(Date.now()));
    setShowWarning(false);
  }, []);

  const extendSession = useCallback(() => {
    resetActivity();
    setRemainingSeconds(timeoutMinutes * 60);
    setShowWarning(false);
  }, [resetActivity, timeoutMinutes]);

  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) return;

    // Initialize activity timestamp
    lastActivityRef.current = Date.now();
    localStorage.setItem('last_active_timestamp', String(Date.now()));

    // Throttled event listener for user activity
    let throttleTimer: any = null;
    const handleUserActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        // Only reset if warning is NOT active, or reset warning if user actively interacts
        lastActivityRef.current = Date.now();
        localStorage.setItem('last_active_timestamp', String(Date.now()));
        throttleTimer = null;
      }, 1000);
    };

    // User interaction events across Desktop and Mobile
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Synchronize across multiple browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'last_active_timestamp' && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Countdown interval running every second
    const interval = setInterval(() => {
      const now = Date.now();
      const last = lastActivityRef.current || now;
      const elapsedSeconds = Math.floor((now - last) / 1000);
      const totalSeconds = timeoutMinutes * 60;
      const left = Math.max(0, totalSeconds - elapsedSeconds);

      setRemainingSeconds(left);

      if (left <= warningThresholdSeconds && left > 0) {
        setShowWarning(true);
      } else if (left > warningThresholdSeconds) {
        setShowWarning(false);
      }

      if (left <= 0) {
        clearInterval(interval);
        setShowWarning(false);
        onTimeout();
      }
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enabled, timeoutMinutes, onTimeout]);

  return {
    remainingSeconds,
    showWarning,
    extendSession,
    resetActivity,
    timeoutMinutes,
    changeTimeoutDuration
  };
}
