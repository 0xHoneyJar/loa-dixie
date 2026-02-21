import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

interface Schedule {
  id: string;
  name: string;
  cronExpression: string;
  humanReadable: string;
  status: string;
  prompt: string;
  nextFireAt?: string;
  lastFiredAt?: string;
  fireCount: number;
}

interface ScheduleManagerProps {
  nftId: string;
}

/**
 * ScheduleManager — NL schedule creation, management, and history.
 * Requires builder+ conviction tier.
 */
export function ScheduleManager({ nftId }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [nlInput, setNlInput] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await api.get<{ schedules: Schedule[] }>(`/api/schedule/${nftId}`);
      setSchedules(res.schedules);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [nftId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleCreate = async () => {
    if (!nlInput.trim() || !promptInput.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post('/api/schedule', {
        nftId,
        nlExpression: nlInput,
        prompt: promptInput,
      });
      setNlInput('');
      setPromptInput('');
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (scheduleId: string) => {
    try {
      await api.delete(`/api/schedule/${scheduleId}`);
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  if (loading) return <div style={{ color: '#9CA3AF', padding: '16px' }}>Loading schedules...</div>;

  const statusColor: Record<string, string> = {
    active: '#34D399',
    pending: '#F59E0B',
    paused: '#60A5FA',
    completed: '#9CA3AF',
    cancelled: '#EF4444',
    failed: '#EF4444',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '16px' }}>Schedules</h3>

      {/* Create form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px' }}>
        <input
          type="text"
          placeholder='e.g., "every Monday morning"'
          value={nlInput}
          onChange={(e) => setNlInput(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '13px' }}
        />
        <input
          type="text"
          placeholder="What should the agent do?"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: '#F9FAFB', fontSize: '13px' }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !nlInput.trim() || !promptInput.trim()}
          style={{
            padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            backgroundColor: creating ? '#374151' : '#2563EB', color: '#FFF', fontSize: '13px',
          }}
        >
          {creating ? 'Creating...' : 'Create Schedule'}
        </button>
      </div>

      {error && <div style={{ color: '#EF4444', fontSize: '12px' }}>{error}</div>}

      {/* Schedule list */}
      {schedules.length === 0 ? (
        <div style={{ color: '#6B7280', fontSize: '13px' }}>No active schedules</div>
      ) : (
        schedules.map((s) => (
          <div key={s.id} style={{ padding: '10px', backgroundColor: '#111827', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#F9FAFB', fontSize: '13px', fontWeight: 600 }}>{s.name}</span>
              <span style={{ color: statusColor[s.status] ?? '#9CA3AF', fontSize: '11px', fontWeight: 600 }}>{s.status.toUpperCase()}</span>
            </div>
            <div style={{ color: '#9CA3AF', fontSize: '11px' }}>{s.humanReadable}</div>
            <div style={{ color: '#6B7280', fontSize: '11px' }}>Fired {s.fireCount} time{s.fireCount !== 1 ? 's' : ''}</div>
            {s.status === 'active' && (
              <button
                onClick={() => handleCancel(s.id)}
                style={{ alignSelf: 'flex-end', padding: '4px 8px', borderRadius: '4px', border: '1px solid #374151', backgroundColor: 'transparent', color: '#EF4444', fontSize: '11px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
