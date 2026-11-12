import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon } from 'lucide-react';

interface InteractiveCalendarProps {
  token: string;
  refreshTrigger: number;
}

export const InteractiveCalendar: React.FC<InteractiveCalendarProps> = ({ token, refreshTrigger }) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const res = await fetch('/api/tasks/calendar', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const tasks = await res.json();
          const calendarEvents = tasks.map((t: any) => ({
            id: String(t.id),
            title: `[${t.priority}] ${t.title}`,
            start: t.dueDate,
            backgroundColor: 
              t.status === 'COMPLETED' ? '#059669' : 
              t.priority === 'CRITICAL' ? '#dc2626' : 
              t.priority === 'HIGH' ? '#ea580c' : '#2563eb',
            borderColor: 'transparent',
            extendedProps: {
              status: t.status,
              priority: t.priority,
              assignedTo: t.assignedToName,
              weight: t.severityWeight
            }
          }));
          setEvents(calendarEvents);
        }
      } catch (err) {
        console.error("Failed to load calendar events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [token, refreshTrigger]);

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm">
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-blue-100">
        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t('calendar')}</h2>
          <p className="text-xs text-slate-500 font-medium">
            Assigned task deadlines & schedule overview
          </p>
        </div>
      </div>

      <div className="fullcalendar-theme text-slate-800">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          height="auto"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
          }}
        />
      </div>

      <style>{`
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #e2e8f0 !important;
        }
        .fc-theme-standard .fc-scrollgrid {
          border-color: #cbd5e1 !important;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .fc-col-header-cell {
          background-color: #eff6ff !important;
          padding: 6px 0 !important;
        }
        .fc-col-header-cell-cushion {
          color: #1e40af !important;
          font-weight: 700 !important;
          text-decoration: none !important;
          font-size: 0.8125rem !important;
        }
        .fc-daygrid-day-number {
          color: #475569 !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          font-size: 0.8125rem !important;
        }
        .fc-button-primary {
          background-color: #2563eb !important;
          border-color: #1d4ed8 !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          border-radius: 0.5rem !important;
          padding: 0.375rem 0.75rem !important;
          font-size: 0.75rem !important;
        }
        .fc-button-primary:hover {
          background-color: #1d4ed8 !important;
        }
        .fc-button-active {
          background-color: #1e40af !important;
          border-color: #1e40af !important;
          color: #ffffff !important;
        }
        .fc-day-today {
          background-color: rgba(37, 99, 235, 0.05) !important;
        }
        .fc .fc-toolbar-title {
          color: #0f172a !important;
          font-size: 1.125rem !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
};
