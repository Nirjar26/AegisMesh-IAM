import PropTypes from 'prop-types';

function AuditStatCard({ title, icon, value, change, color = 'var(--ds-color-info)' }) {
    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--ds-color-text-muted)', fontWeight: 500 }}>{title}</span>
                <span style={{ fontSize: '20px', color }}>{icon}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ds-color-white)' }}>
                {value ?? '—'}
            </div>
            {change !== undefined && (
                <span style={{ fontSize: '12px', color: change >= 0 ? 'var(--ds-color-success)' : 'var(--ds-color-danger)' }}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from previous period
                </span>
            )}
        </div>
    );
}

AuditStatCard.propTypes = {
    title: PropTypes.string.isRequired,
    icon: PropTypes.node,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    change: PropTypes.number,
    color: PropTypes.string,
};

export default AuditStatCard;
