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
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { auditAPI } from '../../services/api';
import {
    DONUT_COLORS,
    EMPTY_ARRAY,
    formatNumber,
    formatIp,
    getTimeRangeLabel,
    getCurrentStats,
    getActivityData,
    getSeverityClass,
} from '../../components/audit/auditHelpers';
import { toTitleCase } from '../../utils/formatters';
import StatCard from '../../components/audit/StatCard';

export default function AuditStatsPage() {
    const [timeRange, setTimeRange] = useState('24h');

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['audit-stats'],
        queryFn: () => auditAPI.getStats().then((response) => response.data?.data),
        refetchInterval: 60000,
    });

    const { data: alertsData, isLoading: alertsLoading } = useQuery({
        queryKey: ['audit-alerts'],
        queryFn: () => auditAPI.getSecurityAlerts().then((response) => response.data?.data),
        refetchInterval: 60000,
    });

    const isLoading = statsLoading || alertsLoading;

    const {
        last24h = {},
        last7d = {},
        last9d = {},
        last30d = {},
        topFailedIPs = EMPTY_ARRAY,
        topActions = EMPTY_ARRAY,
        categoryBreakdown = EMPTY_ARRAY,
        hourlyActivity = EMPTY_ARRAY,
        dailyActivity = EMPTY_ARRAY,
        totalUsers = 0,
    } = statsData || {};

    const alerts = alertsData?.alerts || EMPTY_ARRAY;

    const currentStats = getCurrentStats(timeRange, last24h, last7d, last9d, last30d);

    const rangeLabel = getTimeRangeLabel(timeRange);

    const activityData = getActivityData(timeRange, hourlyActivity, dailyActivity);

    const donutData = categoryBreakdown.map((item, index) => ({
        id: `${item.category}-${index}`,
        name: toTitleCase(item.category),
        value: item.count,
        fill: DONUT_COLORS[index % DONUT_COLORS.length],
    }));

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-[var(--ds-color-bg-0)] px-6 py-10 text-center text-[var(--ds-color-text-muted)]">
                Loading analytics...
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)]">
            <div className="w-full">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[var(--ds-color-text-primary)]">
                            Audit Analytics
                        </h1>

                        <p className="mt-1 text-[13px] text-[var(--ds-color-text-muted)]">
                            System activity and security metrics.
                        </p>
                    </div>

                    <div className="flex gap-1 rounded-xl border border-[var(--ds-color-border)] bg-white p-1 shadow-sm">
                        {['24h', '7d', '9d', '30d'].map((range) => {
                            const active = timeRange === range;

                            return (
                                <button
                                    key={range}
                                    type="button"
                                    onClick={() => setTimeRange(range)}
                                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                                        active
                                            ? 'bg-[var(--ds-color-accent)] text-white shadow-sm'
                                            : 'text-[var(--ds-color-text-muted)] hover:bg-[var(--ds-color-bg-0)] hover:text-[var(--ds-color-text-primary)]'
                                    }`}
                                >
                                    {getTimeRangeLabel(range)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
                    <StatCard
                        icon={<Users size={18} className="text-[var(--ds-color-accent)]" />}
                        iconBg="bg-[var(--ds-color-accent)]/10"
                        label="Total Users"
                        value={totalUsers}
                    />

                    <StatCard
                        icon={<Activity size={18} className="text-[var(--ds-color-info)]" />}
                        iconBg="bg-[var(--ds-color-info)]/10"
                        label="Total Events"
                        value={currentStats.totalEvents || 0}
                    />

                    <StatCard
                        icon={<LogIn size={18} className="text-[var(--ds-color-danger)]" />}
                        iconBg="bg-[var(--ds-color-danger)]/10"
                        label="Failed Logins"
                        value={currentStats.failedLogins || 0}
                        valueClass={
                            (currentStats.failedLogins || 0) === 0
                                ? 'text-[var(--ds-color-success)]'
                                : 'text-[var(--ds-color-text-primary)]'
                        }
                    />

                    <StatCard
                        icon={<UserPlus size={18} className="text-[var(--ds-color-success)]" />}
                        iconBg="bg-[var(--ds-color-success)]/10"
                        label="New Users"
                        value={currentStats.newUsers || 0}
                    />

                    <StatCard
                        icon={<ShieldOff size={18} className="text-[var(--ds-color-warning)]" />}
                        iconBg="bg-[var(--ds-color-warning)]/10"
                        label="Permission Denied"
                        value={currentStats.permissionDenied || 0}
                        valueClass={
                            (currentStats.permissionDenied || 0) === 0
                                ? 'text-[var(--ds-color-success)]'
                                : 'text-[var(--ds-color-text-primary)]'
                        }
                    />
                </div>

                <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--ds-color-border)] bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-5 flex items-center gap-2">
                            <div className="rounded-lg bg-[var(--ds-color-accent)]/10 p-2 text-[var(--ds-color-accent)]">
                                <BarChart2 size={16} />
                            </div>

                            <h3 className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">
                                Activity Volume
                            </h3>

                            <span className="ml-auto text-xs text-[var(--ds-color-text-muted)]">{rangeLabel}</span>
                        </div>

                        <div className="h-[280px] w-full">
                            <ResponsiveContainer>
                                <AreaChart
                                    data={activityData}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -12,
                                        bottom: 0,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="activityFill"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="rgb(var(--ds-rgb-accent) / 0.15)"
                                                stopOpacity={1}
                                            />

                                            <stop
                                                offset="95%"
                                                stopColor="rgb(var(--ds-rgb-accent) / 0)"
                                                stopOpacity={1}
                                            />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-color-bg-0)" />

                                    <XAxis
                                        dataKey="label"
                                        tick={{
                                            fill: 'var(--ds-color-text-muted)',
                                            fontSize: 11,
                                        }}
                                        axisLine={{ stroke: 'var(--ds-color-bg-0)' }}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        tick={{
                                            fill: 'var(--ds-color-text-muted)',
                                            fontSize: 11,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--ds-color-surface)',
                                            border: '1px solid var(--ds-color-border)',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--ds-color-accent)"
                                        strokeWidth={2}
                                        fill="url(#activityFill)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--ds-color-border)] bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-2">
                            <div className="rounded-lg bg-[var(--ds-color-accent)]/10 p-2 text-[var(--ds-color-accent)]">
                                <PieChartIcon size={16} />
                            </div>

                            <h3 className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">
                                Category Breakdown
                            </h3>
                        </div>

                        <div className="h-[240px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        outerRadius={90}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--ds-color-surface)',
                                            border: '1px solid var(--ds-color-border)',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                            {donutData.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-1.5 text-xs text-[var(--ds-color-text-secondary)]"
                                >
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: item.fill }}
                                    />

                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="h-full overflow-hidden rounded-2xl border border-[var(--ds-color-border)] bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-[var(--ds-color-bg-0)] px-6 py-4">
                            <div className="rounded-lg bg-[var(--ds-color-accent)]/10 p-2 text-[var(--ds-color-accent)]">
                                <Zap size={16} />
                            </div>

                            <h3 className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">
                                Top Actions
                            </h3>

                            <span className="ml-auto text-xs text-[var(--ds-color-text-muted)]">{rangeLabel}</span>
                        </div>

                        <div>
                            {topActions.slice(0, 8).map((action) => (
                                <div
                                    key={action.action}
                                    className="border-b border-[var(--ds-color-bg-0)] px-6 py-3 hover:bg-[var(--ds-color-bg-0)] last:border-0"
                                >
                                    <div className="flex items-center">
                                        <p className="truncate text-sm font-medium text-[var(--ds-color-text-primary)]">
                                            {toTitleCase(action.action)}
                                        </p>

                                        <span className="ml-auto mr-4 text-sm font-bold text-[var(--ds-color-text-primary)]">
                                            {formatNumber(action.count)}
                                        </span>

                                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--ds-color-bg-0)]">
                                            <div
                                                className={`h-full rounded-full ${
                                                    action.successRate === 0
                                                        ? 'bg-[var(--ds-color-danger)]'
                                                        : 'bg-[var(--ds-color-accent)]'
                                                }`}
                                                style={{
                                                    width: `${Math.max(2, action.successRate)}%`,
                                                }}
                                            />
                                        </div>

                                        <span className="ml-2 w-8 text-right text-xs text-[var(--ds-color-text-muted)]">
                                            {action.successRate}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-full overflow-hidden rounded-2xl border border-[var(--ds-color-border)] bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-[var(--ds-color-bg-0)] px-6 py-4">
                            <div className="rounded-lg bg-[var(--ds-color-danger)]/10 p-2 text-[var(--ds-color-danger)]">
                                <Shield size={16} />
                            </div>

                            <h3 className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">
                                Top Failed IPs
                            </h3>
                        </div>

                        {topFailedIPs.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-[var(--ds-color-text-muted)]">
                                <div className="rounded-2xl bg-[var(--ds-color-success)]/10 p-3 text-[var(--ds-color-success)]">
                                    <ShieldCheck size={22} />
                                </div>

                                <span>No failed IP activity</span>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 border-b border-[var(--ds-color-bg-0)] bg-[var(--ds-color-bg-0)] px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--ds-color-text-muted)]">
                                    <span>IP Address</span>
                                    <span>Failures</span>
                                    <span>Last Seen</span>
                                </div>

                                <div>
                                    {topFailedIPs.slice(0, 8).map((item) => {
                                        const ipLabel = formatIp(item.ip);

                                        return (
                                            <div
                                                key={`${item.ip}-${item.lastSeen}`}
                                                className="grid grid-cols-3 items-center border-b border-[var(--ds-color-bg-0)] px-6 py-3.5 hover:bg-[var(--ds-color-bg-0)] last:border-0"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate font-mono text-sm text-[var(--ds-color-text-primary)]">
                                                        {ipLabel}
                                                    </p>

                                                    {ipLabel === 'localhost' && (
                                                        <p className="text-xs text-[var(--ds-color-text-muted)]">
                                                            loopback
                                                        </p>
                                                    )}
                                                </div>

                                                <p
                                                    className={`text-sm font-bold ${
                                                        item.count > 0
                                                            ? 'text-[var(--ds-color-danger)]'
                                                            : 'text-[var(--ds-color-success)]'
                                                    }`}
                                                >
                                                    {item.count}
                                                </p>

                                                <p className="text-sm text-[var(--ds-color-text-muted)]">
                                                    {new Date(item.lastSeen).toLocaleDateString(
                                                        'en-US',
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        },
                                                    )}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="h-full overflow-hidden rounded-2xl border border-[var(--ds-color-border)] bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-[var(--ds-color-bg-0)] px-6 py-4">
                            <div className="rounded-lg bg-[var(--ds-color-danger)]/10 p-2 text-[var(--ds-color-danger)]">
                                <AlertTriangle size={16} />
                            </div>

                            <h3 className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">
                                Security Alerts
                            </h3>

                            {alerts.length > 0 && (
                                <span className="ml-auto rounded-full bg-[var(--ds-color-danger)] px-2 py-0.5 text-xs font-bold text-white">
                                    {alerts.length}
                                </span>
                            )}
                        </div>

                        {alerts.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-12 text-center">
                                <div className="rounded-2xl bg-[var(--ds-color-success)]/10 p-4 text-[var(--ds-color-success)]">
                                    <ShieldCheck size={28} />
                                </div>

                                <p className="text-[15px] font-semibold text-[var(--ds-color-text-primary)]">
                                    All clear
                                </p>

                                <p className="text-[12px] text-[var(--ds-color-text-muted)]">
                                    No active security alerts
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-[350px] overflow-y-auto">
                                {alerts.slice(0, 8).map((alert) => (
                                    <div
                                        key={`${alert.type}-${alert.timestamp}`}
                                        className="border-b border-[var(--ds-color-bg-0)] px-6 py-3.5 hover:bg-[var(--ds-color-bg-0)] last:border-0"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm font-semibold text-[var(--ds-color-text-primary)]">
                                                {toTitleCase(alert.type || 'Alert')}
                                            </p>

                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getSeverityClass(
                                                    alert.severity,
                                                )}`}
                                            >
                                                {toTitleCase(alert.severity || 'low')}
                                            </span>
                                        </div>

                                        <p className="mt-1 line-clamp-2 text-xs text-[var(--ds-color-text-muted)]">
                                            {alert.details}
                                        </p>
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
