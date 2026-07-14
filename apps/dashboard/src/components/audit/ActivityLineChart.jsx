import PropTypes from 'prop-types';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

function ActivityLineChart({ data = [], type = 'hourly' }) {
    const formatted = data.map((entry) => ({
        ...entry,
        label:
            type === 'hourly'
                ? `${String(entry.hour).padStart(2, '0')}:00`
                : new Date(entry.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                  }),
    }));

    return (
        <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
                <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: 'var(--ds-color-text-muted)' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: 'var(--ds-color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--ds-color-text-primary)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'var(--ds-color-white)',
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--ds-color-info)"
                        strokeWidth={2}
                        fill="var(--ds-color-info)"
                        fillOpacity={0.2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

ActivityLineChart.propTypes = {
    data: PropTypes.arrayOf(PropTypes.object),
    type: PropTypes.oneOf(['hourly', 'daily']),
};

export default ActivityLineChart;
