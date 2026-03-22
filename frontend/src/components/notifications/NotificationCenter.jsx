import NotificationItem from './NotificationItem';

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'critical', label: 'Critical' },
];

function FilterPill({ active, label, count, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active
                ? 'bg-[#4f46e5] text-white'
                : 'bg-[#eef2ff] text-[#4f46e5] hover:bg-[#e0e7ff]'
                }`}
        >
            {label} ({count})
        </button>
    );
}

function EmptyState({ activeFilter }) {
    const copy = activeFilter === 'unread'
        ? 'Unread alerts will appear here when something important changes.'
        : activeFilter === 'critical'
            ? 'No critical notifications are active right now.'
            : 'Important security, role, and access events will appear here.';

    return (
        <div className="rounded-2xl border border-dashed border-[#d0d7e8] bg-[#f8fafc] px-5 py-10 text-center">
            <p className="text-sm font-medium text-[#0f172a]">No notifications yet</p>
            <p className="mt-2 text-xs leading-5 text-[#64748b]">{copy}</p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-[#e2e8f0] bg-white p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#e2e8f0]" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-40 rounded bg-[#e2e8f0]" />
                            <div className="h-3 w-full rounded bg-[#edf2f7]" />
                            <div className="h-3 w-4/5 rounded bg-[#edf2f7]" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function NotificationCenter({
    notifications,
    allNotifications,
    unreadCount,
    activeFilter,
    connectionMode,
    isLoading,
    isMarkingAllRead,
    pendingReadId,
    pendingDeleteId,
    onFilterChange,
    onMarkAllRead,
    onMarkRead,
    onDelete,
    onOpen,
    onOpenPreferences,
    onOpenSecurity,
}) {
    const sourceNotifications = allNotifications || notifications;
    const allCount = sourceNotifications.length;
    const unreadOnlyCount = sourceNotifications.filter((n) => !n.read).length;
    const criticalCount = sourceNotifications.filter((n) => n.metadata?.severity === 'critical').length;

    const filterCountMap = {
        all: allCount,
        unread: unreadOnlyCount,
        critical: criticalCount,
    };

    return (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-[#dbe4f0] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-[#eef2f7] bg-[linear-gradient(135deg,#f8faff_0%,#ffffff_65%)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-[#0f172a]">Notification Center</p>
                        <div className="mt-1 flex items-center gap-2">
                            <p className="text-xs text-[#64748b]">Real-time account, access, and security updates.</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${connectionMode === 'Live'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-sky-50 text-sky-700'
                                }`}>
                                {connectionMode}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onMarkAllRead}
                        disabled={unreadCount === 0 || isMarkingAllRead}
                        className="rounded-full border border-[#d0d7e8] px-3 py-1.5 text-xs font-medium text-[#334155] hover:border-[#4f46e5] hover:text-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isMarkingAllRead ? 'Saving...' : 'Mark all read'}
                    </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map((filter) => (
                            <FilterPill
                                key={filter.id}
                                label={filter.label}
                                count={filterCountMap[filter.id] ?? 0}
                                active={activeFilter === filter.id}
                                onClick={() => onFilterChange?.(filter.id)}
                            />
                        ))}
                    </div>

                    <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] font-semibold text-[#4f46e5]">
                        {unreadCount} unread
                    </span>
                </div>
            </div>

            <div className="max-h-[28rem] overflow-y-auto bg-[#f8fafc] px-4 py-4">
                {isLoading ? <LoadingState /> : null}

                {!isLoading && notifications.length === 0 ? <EmptyState activeFilter={activeFilter} /> : null}

                {!isLoading && notifications.length > 0 ? (
                    <div className="space-y-3 transition-opacity duration-150">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onOpen={onOpen}
                                onMarkRead={onMarkRead}
                                onDelete={onDelete}
                                isMarkingRead={pendingReadId === notification.id}
                                isDeleting={pendingDeleteId === notification.id}
                            />
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="border-t border-[#eef2f7] bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onOpenPreferences}
                        className="flex-1 rounded-xl border border-[#d0d7e8] px-3 py-2 text-sm font-medium text-[#334155] hover:border-[#4f46e5] hover:text-[#4f46e5]"
                    >
                        Notification Preferences
                    </button>
                    <button
                        type="button"
                        onClick={onOpenSecurity}
                        className="flex-1 rounded-xl bg-[#4f46e5] px-3 py-2 text-sm font-medium text-white hover:bg-[#3730a3]"
                    >
                        Review Security
                    </button>
                </div>
            </div>
        </div>
    );
}