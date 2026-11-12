import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { playAbsenceChime } from '../utils/audioChime';

export interface AbsenceAlert {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  absenceDate: string;
  category: string;
  reason: string;
  tasksAtRisk: any[];
  timestamp: string;
  dates?: string[];
  daysCount?: number;
  startDate?: string;
  endDate?: string;
  filedBy?: string;
}

export interface LiveFeedItem {
  id: string;
  eventType: string;
  title: string;
  message: string;
  employeeName: string;
  severity: string;
  timestamp: string;
}

export function useStompWebSocket(userId?: number, role?: string) {
  const [connected, setConnected] = useState(false);
  const [absenceAlerts, setAbsenceAlerts] = useState<AbsenceAlert[]>([]);
  const [latestAlert, setLatestAlert] = useState<AbsenceAlert | null>(null);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  const [taskUpdateTrigger, setTaskUpdateTrigger] = useState(0);
  const [attendanceUpdateTrigger, setAttendanceUpdateTrigger] = useState(0);
  const [messageUpdateTrigger, setMessageUpdateTrigger] = useState(0);
  const clientRef = useRef<Client | null>(null);

  const dismissLatestAlert = useCallback(() => {
    setLatestAlert(null);
  }, []);

  const isAdmin = role === 'ADMIN' || String(role).toUpperCase() === 'ADMIN';

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerUrl = `${protocol}//${window.location.host}/ws-attendance`;
    
    const client = new Client({
      brokerURL: brokerUrl,
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnected(true);
        console.log("Connected to STOMP WebSocket broker");

        // Sub-200ms Instant Absence Alerts & Live Feed (Admin Only)
        if (isAdmin) {
          const handleAbsenceMessage = (message: any) => {
            try {
              const alert: AbsenceAlert = JSON.parse(message.body);
              playAbsenceChime();
              setLatestAlert(alert);
              setAbsenceAlerts((prev) => [alert, ...prev.slice(0, 20)]);
              setAttendanceUpdateTrigger((prev) => prev + 1);
            } catch (err) {
              console.error("Error parsing absence alert", err);
            }
          };

          client.subscribe('/topic/admin/absences', handleAbsenceMessage);
          client.subscribe('/topic/absences', handleAbsenceMessage);

          // Live Check-in & Status changes (Green/Red/Gray)
          client.subscribe('/topic/admin/attendance', () => {
            setAttendanceUpdateTrigger((prev) => prev + 1);
          });

          // Real-time task deliverable updates submitted by employees
          client.subscribe('/topic/admin/tasks', () => {
            setTaskUpdateTrigger((prev) => prev + 1);
          });

          // Live Activity Ticker Feed
          client.subscribe('/topic/admin/live-feed', (message) => {
            try {
              const item: LiveFeedItem = JSON.parse(message.body);
              setLiveFeed((prev) => [item, ...prev.slice(0, 30)]);
            } catch (err) {
              console.error("Error parsing live feed item", err);
            }
          });
        }

        // Real-time Chat Messages for all users (Admin & Employees)
        client.subscribe('/topic/messages', () => {
          setMessageUpdateTrigger((prev) => prev + 1);
        });

        // Global task updates
        client.subscribe('/topic/tasks/updates', () => {
          setTaskUpdateTrigger((prev) => prev + 1);
        });

        // Personal notifications for this employee
        if (userId) {
          client.subscribe(`/topic/employee/${userId}`, (message) => {
            try {
              const data = JSON.parse(message.body);
              if (data && data.type === 'NEW_MESSAGE') {
                setMessageUpdateTrigger((prev) => prev + 1);
              } else if (data && data.type === 'ABSENCE_RECORDED') {
                setAttendanceUpdateTrigger((prev) => prev + 1);
              } else {
                setTaskUpdateTrigger((prev) => prev + 1);
              }
            } catch (err) {
              setTaskUpdateTrigger((prev) => prev + 1);
              setMessageUpdateTrigger((prev) => prev + 1);
            }
          });
        }
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error("STOMP Broker error: " + frame.headers['message']);
      }
    });

    client.activate();
    clientRef.current = client;

    // Reliability Poll: For Admin, check latest absence alert every 2s as instant sync fallback
    let pollTimer: any = null;
    let lastSeenAlertTimestamp: string | null = null;
    if (isAdmin) {
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch('/api/attendance/latest-alert');
          if (res.ok) {
            const data = await res.json();
            if (data && data.timestamp && data.timestamp !== lastSeenAlertTimestamp) {
              if (lastSeenAlertTimestamp !== null) {
                playAbsenceChime();
              }
              lastSeenAlertTimestamp = data.timestamp;
              setLatestAlert(data);
              setAttendanceUpdateTrigger((prev) => prev + 1);
            }
          }
        } catch (e) {}
      }, 2000);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      client.deactivate();
    };
  }, [userId, role, isAdmin]);

  return {
    connected,
    absenceAlerts,
    latestAlert,
    dismissLatestAlert,
    liveFeed,
    taskUpdateTrigger,
    attendanceUpdateTrigger,
    messageUpdateTrigger,
  };
}

