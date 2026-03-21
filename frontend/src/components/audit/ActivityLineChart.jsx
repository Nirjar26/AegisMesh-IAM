import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function ActivityLineChart({ data = [], type = 'hourly' }) {
    const formatted = data.map(d => ({
        ...d,
        label: type === 'hourly'
            ? `${String(d.hour).padStart(2, '0')}:00`
            : new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    return (
        <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
                <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#F1F5F9' }} />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}


