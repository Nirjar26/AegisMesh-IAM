import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    AlertTriangle,
    BarChart2,
    LogIn,
    PieChart as PieChartIcon,
    Shield,
    ShieldCheck,
    ShieldOff,
    UserPlus,
    Users,
    Zap,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { auditAPI } from '../../services/api';

const DONUT_COLORS = ['#4f46e5', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c'];
const EMPTY_ARRAY = [];

function toTitleCase(value = '') {
    return value
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatNumber(value = 0) {
    return new Intl.NumberFormat('en-US').format(value);
}

function formatIp(ip) {
    if (ip === '::1' || ip === '127.0.0.1') return 'localhost';
    return ip || '-';
}

export default function AuditStatsPage() {
    const [timeRange, setTimeRange] = useState('24h');

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['audit-stats'],
        queryFn: () => auditAPI.getStats().then((r) => r.data?.data),
        refetchInterval: 60000,
    });

    const { data: alertsData, isLoading: alertsLoading } = useQuery({
        queryKey: ['audit-alerts'],
        queryFn: () => auditAPI.getSecurityAlerts().then((r) => r.data?.data),
        refetchInterval: 60000,
    });

    const isLoading = statsLoading || alertsLoading;

    const {
        last24h = {},
        last7d = {},
        last30d = {},
        topFailedIPs = EMPTY_ARRAY,
        topActions = EMPTY_ARRAY,
        categoryBreakdown = EMPTY_ARRAY,
        hourlyActivity = EMPTY_ARRAY,
        dailyActivity = EMPTY_ARRAY,
        totalUsers = 0,
    } = statsData || {};

    const alerts = alertsData?.alerts || EMPTY_ARRAY;

    const currentStats = timeRange === '24h' ? last24h : timeRange === '7d' ? last7d : last30d;
    const rangeLabel = timeRange === '24h' ? 'Last 24 Hours' : timeRange === '7d' ? 'Last 7 Days' : 'Last 30 Days';

    const activityData = timeRange === '24h'
        ? hourlyActivity.map((row) => ({
            label: `${String(row.hour).padStart(2, '0')}:00`,
            count: row.count,
        }))
        : dailyActivity.map((row) => ({
            label: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: row.count,
        }));

    const donutData = categoryBreakdown.map((item, idx) => ({
        name: toTitleCase(item.category),
        value: item.count,
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
    }));

    if (isLoading) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#f4f6fb] px-6 py-10 text-center text-[#7a87a8]">Loading analytics...</div>;
    }

    return (
        <div className="min-h-[calc(100vh-64px)]">
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Audit Analytics</h1>
                        <p className="text-[13px] text-[#7a87a8] mt-1">System activity and security metrics.</p>
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-xl p-1 flex gap-1 shadow-sm">
                        {['24h', '7d', '30d'].map((range) => {
                            const active = timeRange === range;
                            return (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${active
                                        ? 'bg-[#4f46e5] text-white shadow-sm'
                                        : 'text-[#7a87a8] hover:text-[#0f1623] hover:bg-[#f4f6fb]'
                                        }`}
                                >
                                    {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <StatCard
                        icon={<Users size={18} className="text-[#4f46e5]" />}
                        iconBg="bg-[#4f46e5]/10"
                        label="Total Users"
                        value={totalUsers}
                    />
                    <StatCard
                        icon={<Activity size={18} className="text-[#2563eb]" />}
                        iconBg="bg-[#2563eb]/10"
                        label="Total Events"
                        value={currentStats.totalEvents || 0}
                    />
                    <StatCard
                        icon={<LogIn size={18} className="text-[#dc2626]" />}
                        iconBg="bg-[#dc2626]/10"
                        label="Failed Logins"
                        value={currentStats.failedLogins || 0}
                        valueClass={(currentStats.failedLogins || 0) === 0 ? 'text-[#16a34a]' : 'text-[#0f1623]'}
                    />
                    <StatCard
                        icon={<UserPlus size={18} className="text-[#16a34a]" />}
                        iconBg="bg-[#16a34a]/10"
                        label="New Users"
                        value={currentStats.newUsers || 0}
                    />
                    <StatCard
                        icon={<ShieldOff size={18} className="text-[#d97706]" />}
                        iconBg="bg-[#d97706]/10"
                        label="Permission Denied"
                        value={currentStats.permissionDenied || 0}
                        valueClass={(currentStats.permissionDenied || 0) === 0 ? 'text-[#16a34a]' : 'text-[#0f1623]'}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                    <div className="lg:col-span-2 bg-white border border-[#d0d7e8] rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="bg-[#4f46e5]/10 rounded-lg p-2 text-[#4f46e5]">
                                <BarChart2 size={16} />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0f1623]">Activity Volume</h3>
                            <span className="ml-auto text-xs text-[#7a87a8]">{rangeLabel}</span>
                        </div>

                        <div className="w-full h-[280px]">
                            <ResponsiveContainer>
                                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="rgba(79,70,229,0.15)" stopOpacity={1} />
                                            <stop offset="95%" stopColor="rgba(79,70,229,0)" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" />
                                    <XAxis dataKey="label" tick={{ fill: '#7a87a8', fontSize: 11 }} axisLine={{ stroke: '#f0f2f8' }} tickLine={false} />
                                    <YAxis tick={{ fill: '#7a87a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#fff',
                                            border: '1px solid #d0d7e8',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fill="url(#activityFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-white border border-[#d0d7e8] rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="bg-[#4f46e5]/10 rounded-lg p-2 text-[#4f46e5]">
                                <PieChartIcon size={16} />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0f1623]">Category Breakdown</h3>
                        </div>

                        <div className="w-full h-[240px]">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                                        {donutData.map((entry, idx) => (
                                            <Cell key={`donut-${entry.name}-${idx}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#fff',
                                            border: '1px solid #d0d7e8',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
                            {donutData.map((item) => (
                                <div key={item.name} className="flex items-center gap-1.5 text-xs text-[#3a4560]">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm h-full">
                        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-2">
                            <div className="bg-[#4f46e5]/10 rounded-lg p-2 text-[#4f46e5]">
                                <Zap size={16} />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0f1623]">Top Actions</h3>
                            <span className="text-xs text-[#7a87a8] ml-auto">{rangeLabel}</span>
                        </div>

                        <div>
                            {topActions.slice(0, 8).map((action) => (
                                <div key={action.action} className="px-6 py-3 border-b border-[#f0f2f8] last:border-0 hover:bg-[#f8f9fd]">
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-[#0f1623] truncate">{toTitleCase(action.action)}</p>
                                        <span className="text-sm font-bold text-[#0f1623] ml-auto mr-4">{formatNumber(action.count)}</span>
                                        <div className="w-20 h-1.5 bg-[#f0f2f8] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${action.successRate === 0 ? 'bg-[#dc2626]' : 'bg-[#4f46e5]'}`}
                                                style={{ width: `${Math.max(2, action.successRate)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-[#7a87a8] w-8 text-right ml-2">{action.successRate}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm h-full">
                        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-2">
                            <div className="bg-[#dc2626]/10 rounded-lg p-2 text-[#dc2626]">
                                <Shield size={16} />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0f1623]">Top Failed IPs</h3>
                        </div>

                        {topFailedIPs.length === 0 ? (
                            <div className="py-10 text-center text-sm text-[#7a87a8] flex flex-col items-center gap-2">
                                <div className="bg-[#16a34a]/10 rounded-2xl p-3 text-[#16a34a]">
                                    <ShieldCheck size={22} />
                                </div>
                                <span>No failed IP activity</span>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 py-2 bg-[#f4f6fb] border-b border-[#f0f2f8] grid grid-cols-3 text-[10px] font-semibold tracking-widest uppercase text-[#7a87a8]">
                                    <span>IP Address</span>
                                    <span>Failures</span>
                                    <span>Last Seen</span>
                                </div>
                                <div>
                                    {topFailedIPs.slice(0, 8).map((item) => {
                                        const ipLabel = formatIp(item.ip);
                                        return (
                                            <div key={item.ip} className="px-6 py-3.5 border-b border-[#f0f2f8] last:border-0 hover:bg-[#f8f9fd] grid grid-cols-3 items-center">
                                                <div className="min-w-0">
                                                    <p className="font-mono text-sm text-[#0f1623] truncate">{ipLabel}</p>
                                                    {ipLabel === 'localhost' && <p className="text-xs text-[#7a87a8]">loopback</p>}
                                                </div>
                                                <p className={`text-sm font-bold ${item.count > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>{item.count}</p>
                                                <p className="text-sm text-[#7a87a8]">{new Date(item.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm h-full">
                        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-2">
                            <div className="bg-[#dc2626]/10 rounded-lg p-2 text-[#dc2626]">
                                <AlertTriangle size={16} />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0f1623]">Security Alerts</h3>
                            {alerts.length > 0 && (
                                <span className="bg-[#dc2626] text-white text-xs px-2 py-0.5 rounded-full font-bold ml-auto">
                                    {alerts.length}
                                </span>
                            )}
                        </div>

                        {alerts.length === 0 ? (
                            <div className="py-12 flex flex-col items-center gap-3 text-center">
                                <div className="bg-[#16a34a]/10 rounded-2xl p-4 text-[#16a34a]">
                                    <ShieldCheck size={28} />
                                </div>
                                <p className="text-[15px] font-semibold text-[#0f1623]">All clear</p>
                                <p className="text-[12px] text-[#7a87a8]">No active security alerts</p>
                            </div>
                        ) : (
                            <div className="max-h-[350px] overflow-y-auto">
                                {alerts.slice(0, 8).map((alert, idx) => (
                                    <div key={`alert-${idx}`} className="px-6 py-3.5 border-b border-[#f0f2f8] last:border-0 hover:bg-[#f8f9fd]">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-[#0f1623] truncate">{toTitleCase(alert.type || 'Alert')}</p>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'bg-[#dc2626]/10 text-[#dc2626]' : alert.severity === 'MEDIUM' ? 'bg-[#d97706]/10 text-[#d97706]' : 'bg-[#4f46e5]/8 text-[#4f46e5]'}`}>
                                                {toTitleCase(alert.severity || 'low')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#7a87a8] mt-1 line-clamp-2">{alert.details}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, iconBg, label, value, valueClass = 'text-[#0f1623]' }) {
    return (
        <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
            <div>
                <p className={`text-2xl font-bold ${valueClass}`}>{formatNumber(value)}</p>
                <p className="text-xs text-[#7a87a8] mt-0.5">{label}</p>
            </div>
        </div>
    );
}


