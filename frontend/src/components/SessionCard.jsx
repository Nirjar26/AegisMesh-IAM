export default function SessionCard({ session, onRevoke, isRevoking, isCurrent = false }) {
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const parseDeviceInfo = (deviceAgent) => {
        if (!deviceAgent) return { browser: 'Unknown', os: 'Unknown', icon: '🌐' };
        const ua = deviceAgent.toLowerCase();

        let browser = 'Unknown';
        let icon = '🌐';
        if (ua.includes('chrome') && !ua.includes('edge')) { browser = 'Chrome'; icon = '🟢'; }
        else if (ua.includes('firefox')) { browser = 'Firefox'; icon = '🦊'; }
        else if (ua.includes('safari') && !ua.includes('chrome')) { browser = 'Safari'; icon = '🔵'; }
        else if (ua.includes('edge')) { browser = 'Edge'; icon = '🔷'; }

        let os = 'Unknown';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('mac')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

        return { browser, os, icon };
    };

    const userAgent = session.deviceInfo;
    const device = parseDeviceInfo(userAgent);

    return (
        <div className={`glass rounded-xl p-5 transition-all duration-300 hover:border-aws-orange/20 ${isCurrent ? 'border-aws-orange/30 shadow-lg shadow-aws-orange/5' : ''
            }`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-aws-navy-light flex items-center justify-center text-lg shrink-0">
                        {device.icon}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-[#0f1623] truncate">
                                {device.browser} on {device.os}
                            </h4>
                            {isCurrent && (
                                <span className="text-[10px] font-semibold bg-aws-orange/15 text-aws-orange px-2 py-0.5 rounded-full whitespace-nowrap">
                                    Current
                                </span>
                            )}
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs text-aws-text-dim flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                {session.ipAddress || 'Unknown IP'}
                            </p>
                            <p className="text-xs text-aws-text-dim flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Created: {formatDate(session.createdAt)}
                            </p>
                            <p className="text-xs text-aws-text-dim flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3M16 7V3M3 11h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Expires: {formatDate(session.expiresAt)}
                            </p>
                        </div>
                    </div>
                </div>

                {!isCurrent && (
                    <button
                        onClick={() => onRevoke(session.id)}
                        disabled={isRevoking}
                        className="shrink-0 text-xs font-medium text-aws-red hover:text-red-400 bg-aws-red/5 hover:bg-aws-red/10 px-3 py-1.5 rounded-lg border border-aws-red/20 hover:border-aws-red/40 transition-all duration-200 disabled:opacity-50"
                    >
                        {isRevoking ? 'Revoking...' : 'Revoke'}
                    </button>
                )}
            </div>
        </div>
    );
}


