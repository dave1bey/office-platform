import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from './components/Navbar';
import { AbsenceAlertBanner } from './components/AbsenceAlertBanner';
import { MobileAttendanceCard } from './components/MobileAttendanceCard';
import { LeaderboardView } from './components/LeaderboardView';
import { EmployeePerformanceView } from './components/EmployeePerformanceView';
import { TaskManagerView } from './components/TaskManagerView';
import { InteractiveCalendar } from './components/InteractiveCalendar';
import { LiveActivityFeed } from './components/LiveActivityFeed';
import { TeamStaffManagement } from './components/TeamStaffManagement';
import { CommunicationCenter } from './components/CommunicationCenter';
import { LoginView } from './components/LoginView';
import { SessionWarningModal } from './components/SessionWarningModal';
import { useStompWebSocket } from './hooks/useStompWebSocket';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { CheckSquare, Trophy, Calendar, Users, MessageSquare, LayoutGrid, TrendingUp } from 'lucide-react';

export const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'TASKS' | 'LEADERBOARD' | 'MY_RATE' | 'CALENDAR' | 'TEAMS_STAFF' | 'COMMUNICATION'>('TASKS');
  const [dataRefreshCounter, setDataRefreshCounter] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Session Security: Inactivity Auto-Logout (10-minute default shift/session protection)
  const handleSessionTimeout = useCallback(() => {
    localStorage.setItem('session_expired_notice', 'true');
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }, []);

  const {
    remainingSeconds,
    showWarning,
    extendSession,
    timeoutMinutes,
    changeTimeoutDuration
  } = useSessionTimeout({
    enabled: Boolean(user),
    onTimeout: handleSessionTimeout,
    defaultMinutes: 10
  });

  // Listen for native PWA install prompt event (Android Chrome / Edge)
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Initialize real-time WebSocket connection
  const {
    connected,
    latestAlert,
    dismissLatestAlert,
    liveFeed,
    taskUpdateTrigger,
    attendanceUpdateTrigger,
    messageUpdateTrigger,
  } = useStompWebSocket(user?.userId, user?.role);

  // Sync preferred language when user logs in
  useEffect(() => {
    if (user?.preferredLang) {
      i18n.changeLanguage(user.preferredLang);
      localStorage.setItem('user_language', user.preferredLang);
    }
  }, [user]);

  // Combined trigger for real-time updates (tasks, attendance, messages)
  const combinedTrigger = dataRefreshCounter + taskUpdateTrigger + attendanceUpdateTrigger + messageUpdateTrigger;

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('session_expired_notice');
  }, []);

  // Strictly verify session token with backend on startup:
  // If invalid or stale, immediately clear storage and prompt clean login
  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed || !parsed.token) {
          handleLogout();
          return;
        }
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${parsed.token}` }
        })
        .then(res => {
          if (!res.ok) {
            console.warn("Cached session rejected by server. Resetting to login.");
            handleLogout();
          }
        })
        .catch(() => {
          // If offline or network error, let offline PWA retain state
        });
      } catch (e) {
        handleLogout();
      }
    }
  }, [handleLogout]);

  const handleLogin = (authData: any) => {
    localStorage.removeItem('session_expired_notice');
    setUser(authData);
    localStorage.setItem('auth_user', JSON.stringify(authData));
    localStorage.setItem('auth_token', authData.token);
    extendSession();
  };

  if (!user) {
    return <LoginView onLoginSuccess={handleLogin} deferredPrompt={deferredPrompt} />;
  }

  const token = user.token || localStorage.getItem('auth_token') || '';

  return (
    <div className="min-h-screen flex flex-col font-sans w-full">
      {/* Top Navigation with Session Status */}
      <Navbar
        user={user}
        token={token}
        onLogout={handleLogout}
        connected={connected}
        deferredPrompt={deferredPrompt}
        sessionRemainingSeconds={remainingSeconds}
        sessionTimeoutMinutes={timeoutMinutes}
        onChangeSessionTimeout={changeTimeoutDuration}
        onExtendSession={extendSession}
        onDataRestored={() => setDataRefreshCounter((prev) => prev + 1)}
      />

      {/* 60-second Session Inactivity Warning Modal */}
      <SessionWarningModal
        isOpen={showWarning}
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={extendSession}
        onLogoutNow={handleLogout}
      />

      {/* Expanding Red Absence Alert Banner (Sub-200ms STOMP broadcast) */}
      <AbsenceAlertBanner
        alert={latestAlert}
        onDismiss={dismissLatestAlert}
        currentUser={user}
        token={token}
        onAbsenceUpdated={() => setDataRefreshCounter((prev) => prev + 1)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full space-y-6">
        
        {/* Quick Mobile Check-in & Absence Filing Card */}
        <MobileAttendanceCard
          token={token}
          currentUser={user}
          onAttendanceChanged={() => setDataRefreshCounter((prev) => prev + 1)}
        />

        {/* View Navigation Tabs */}
        <div className="flex border-b border-blue-200 space-x-1 sm:space-x-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('TASKS')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
              activeTab === 'TASKS'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span>{t('tasks')}</span>
          </button>

          {/* Performance & Accomplishment Rate Tab: Admin sees full company Leaderboard; Employee sees personal Accomplishment Rate */}
          {user.role === 'ADMIN' ? (
            <button
              onClick={() => setActiveTab('LEADERBOARD')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'LEADERBOARD'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>{t('leaderboard')}</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('MY_RATE')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'MY_RATE'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>My Accomplishment Rate</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
              activeTab === 'CALENDAR'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>{t('calendar')}</span>
          </button>

          {/* Admin Staff & Team Management Tab */}
          {user.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('TEAMS_STAFF')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'TEAMS_STAFF'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                  : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Staff & Groups</span>
            </button>
          )}

          {/* Communication Tab (Admin & Employee) */}
          <button
            onClick={() => setActiveTab('COMMUNICATION')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
              activeTab === 'COMMUNICATION'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Messages</span>
          </button>
        </div>

        {/* Main Grid: Content + Sidebar Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'TASKS' && (
              <TaskManagerView
                token={token}
                currentUser={user}
                refreshTrigger={combinedTrigger}
                onTaskUpdated={() => setDataRefreshCounter((prev) => prev + 1)}
              />
            )}

            {activeTab === 'LEADERBOARD' && user.role === 'ADMIN' && (
              <LeaderboardView
                token={token}
                refreshTrigger={combinedTrigger}
                currentUser={user}
              />
            )}

            {activeTab === 'MY_RATE' && user.role === 'EMPLOYEE' && (
              <EmployeePerformanceView
                token={token}
                currentUser={user}
                refreshTrigger={combinedTrigger}
                onAbsenceReported={() => setDataRefreshCounter((prev) => prev + 1)}
              />
            )}

            {activeTab === 'CALENDAR' && (
              <InteractiveCalendar
                token={token}
                refreshTrigger={combinedTrigger}
              />
            )}

            {activeTab === 'TEAMS_STAFF' && user.role === 'ADMIN' && (
              <TeamStaffManagement
                token={token}
                refreshTrigger={combinedTrigger}
                onDataChanged={() => setDataRefreshCounter((prev) => prev + 1)}
              />
            )}

            {activeTab === 'COMMUNICATION' && (
              <CommunicationCenter
                token={token}
                currentUser={user}
                refreshTrigger={combinedTrigger}
              />
            )}
          </div>

          {/* Right Column: Live STOMP Activity Ticker (Admin sees employee input live) */}
          <div className="lg:col-span-1">
            <LiveActivityFeed feed={liveFeed} />
          </div>
        </div>

      </main>
    </div>
  );
};
export default App;

