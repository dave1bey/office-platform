import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Users, User, Clock, Bell, CheckCheck } from 'lucide-react';

interface MessageItem {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: 'ADMIN' | 'EMPLOYEE';
  recipientType: 'ALL' | 'TEAM' | 'EMPLOYEE';
  recipientId?: number | null;
  recipientName: string;
  content: string;
  createdAt: string;
}

interface CommunicationCenterProps {
  token: string;
  currentUser: any;
  refreshTrigger: number;
}

export const CommunicationCenter: React.FC<CommunicationCenterProps> = ({
  token,
  currentUser,
  refreshTrigger
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [recipientType, setRecipientType] = useState<'ALL' | 'TEAM' | 'EMPLOYEE'>('ALL');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMessagesAndRecipients = async () => {
    try {
      const q = currentUser.role === 'EMPLOYEE'
        ? `?employeeId=${currentUser.userId}&role=EMPLOYEE`
        : `?role=ADMIN`;

      const [msgRes, empRes, teamRes] = await Promise.all([
        fetch(`/api/messages${q}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (msgRes.ok) setMessages(await msgRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (teamRes.ok) setTeams(await teamRes.json());
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessagesAndRecipients();
    const interval = setInterval(() => {
      fetchMessagesAndRecipients();
    }, 2500);
    return () => clearInterval(interval);
  }, [refreshTrigger, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSending(true);

    const isEmp = currentUser.role === 'EMPLOYEE';
    let recType: 'ALL' | 'TEAM' | 'EMPLOYEE' = isEmp ? 'EMPLOYEE' : recipientType;
    let recName = isEmp ? "Administrator" : "All Staff";
    let recId: number | null = isEmp ? 1 : null;

    if (!isEmp) {
      if (recipientType === 'EMPLOYEE') {
        const emp = employees.find(e => String(e.id) === selectedRecipientId);
        recName = emp ? emp.fullName : "Staff Member";
        recId = emp ? emp.id : null;
      } else if (recipientType === 'TEAM') {
        const team = teams.find(t => String(t.id) === selectedRecipientId);
        recName = team ? `${team.teamName} Department` : "Team";
        recId = team ? team.id : null;
      }
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          senderId: currentUser.userId,
          senderName: currentUser.fullName,
          senderRole: currentUser.role,
          recipientType: recType,
          recipientId: recId,
          recipientName: recName,
          content
        })
      });

      if (res.ok) {
        setContent('');
        fetchMessagesAndRecipients();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-blue-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {currentUser.role === 'ADMIN' ? 'Admin & Staff Communication' : 'Messages from Management'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {currentUser.role === 'ADMIN'
                ? 'Send instant instructions or announcements to individual staff, teams, or all employees'
                : 'Direct communications, team updates, and notices from management'}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          {messages.length} messages
        </span>
      </div>

      {/* Message Composer */}
      <form onSubmit={handleSendMessage} className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700">
            {currentUser.role === 'ADMIN' ? 'Compose Message / Directive:' : 'Send Note to Admin:'}
          </span>

          {currentUser.role === 'ADMIN' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="text-slate-600 font-bold">To:</label>
              <select
                value={recipientType}
                onChange={(e) => {
                  setRecipientType(e.target.value as any);
                  setSelectedRecipientId('');
                }}
                className="bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">📢 All Staff</option>
                <option value="TEAM">👥 Specific Team</option>
                <option value="EMPLOYEE">👤 Specific Employee</option>
              </select>

              {recipientType === 'TEAM' && (
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600"
                  required
                >
                  <option value="">Select Team...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.teamName}</option>
                  ))}
                </select>
              )}

              {recipientType === 'EMPLOYEE' && (
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="bg-white border border-blue-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-600"
                  required
                >
                  <option value="">Select Employee...</option>
                  {employees.filter(e => e.id !== currentUser.userId).map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={currentUser.role === 'ADMIN' ? "Write message, instructions, or office notice..." : "Write a note or question to the Administrator..."}
            className="flex-1 bg-white border border-blue-200 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition"
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? "Sending..." : "Send"}</span>
          </button>
        </div>
      </form>

      {/* Messages Stream */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Loading communications...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 italic">
            No messages sent yet. Use the compose box above to start communication.
          </div>
        ) : (
          messages.map((msg) => {
            const isAdminSender = msg.senderRole === 'ADMIN';

            return (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border transition ${
                  isAdminSender
                    ? 'bg-blue-50/70 border-blue-200 text-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-xs">
                      {msg.senderId === currentUser.userId ? `${msg.senderName} (You)` : msg.senderName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isAdminSender ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {msg.senderRole}
                    </span>
                    <span className="text-slate-400 text-xs">&rarr;</span>
                    <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                      {msg.recipientId === currentUser.userId ? `${msg.recipientName} (You)` : msg.recipientName}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(msg.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
