import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CATEGORY_CONFIG } from './auditConfig';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#DC2626', '#6B7280', '#7C3AED'];

export default function CategoryDonutChart({ data = [] }) {
    const chartData = data.map(d => ({
        name: CATEGORY_CONFIG[d.category]?.label || d.category,
        value: d.count,
        color: CATEGORY_CONFIG[d.category]?.color || '#6B7280',
    }));

    return (
        <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={chartData}
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {chartData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#F1F5F9' }} />
                    <Legend
                        formatter={(value) => <span style={{ color: '#94A3B8', fontSize: '11px' }}>{value}</span>}
                        iconSize={8}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}


