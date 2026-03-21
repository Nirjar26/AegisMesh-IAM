import { useState, useEffect, useRef } from 'react';
import AuditLogTable from './AuditLogTable';

export default function LiveAuditFeed({ onRowClick }) {
    const [isLive, setIsLive] = useState(false);
    const [logs, setLogs] = useState([]);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        if (!isLive) {
            eventSourceRef.current?.close();
            eventSourceRef.current = null;
            return;
        }

        const es = new EventSource('/api/audit-logs/stream');
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'ping' || data.type === 'connected') return;
                setLogs(prev => [data, ...prev].slice(0, 100));
            } catch (parseError) {
                console.debug('Failed to parse live audit event payload', parseError);
            }
        };

        es.onerror = () => {
            // SSE will auto-reconnect after error for EventSource
        };

        return () => { es.close(); };
    }, [isLive]);

    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isLive ? '#10B981' : '#64748B',
                        animation: isLive ? 'pulse 2s infinite' : 'none',
                        boxShadow: isLive ? '0 0 8px #10B981' : 'none',
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>
                        Live Feed {isLive ? 'ON' : 'OFF'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>({logs.length} events)</span>
                </div>
                <button
                    onClick={() => setIsLive(!isLive)}
                    style={{
                        padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '6px',
                        border: 'none', cursor: 'pointer',
                        background: isLive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        color: isLive ? '#EF4444' : '#10B981',
                    }}
                >{isLive ? 'Stop' : 'Start Live Feed'}</button>
            </div>

            {isLive && <AuditLogTable logs={logs} onRowClick={onRowClick} />}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}


