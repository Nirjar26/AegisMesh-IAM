import PropTypes from 'prop-types';
import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CATEGORY_CONFIG } from './auditConfig';

function renderLegendLabel(value) {
    return <span style={{ color: 'var(--ds-color-text-muted)', fontSize: '11px' }}>{value}</span>;
}

export default function CategoryDonutChart({ data = [] }) {
    const chartData = data.map((entry) => ({
        name: CATEGORY_CONFIG[entry.category]?.label || entry.category,
        value: entry.count,
        fill: CATEGORY_CONFIG[entry.category]?.color || 'var(--ds-color-text-muted)',
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
                    <Legend formatter={renderLegendLabel} iconSize={8} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

CategoryDonutChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            category: PropTypes.string,
            count: PropTypes.number,
        }),
    ),
};
