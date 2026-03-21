import React from 'react';
import { Monitor, Smartphone, Tablet, Globe, Clock, ShieldX } from 'lucide-react';

export default function SessionCard({ session, isCurrent, onRevoke, isRevoking }) {
    if (!session) return null;

    const deviceName = session.device || 'Desktop Device';
    const browserName = session.browser || 'Unknown Browser';
    const osName = session.os || 'Unknown OS';
    const ipAddress = session.ipAddress || '127.0.0.1';

    // Determine Icon based on device
    let DeviceIcon = Monitor;
    const lowerDevice = deviceName.toLowerCase();
    if (lowerDevice.includes('mobile') || lowerDevice.includes('iphone') || lowerDevice.includes('android')) {
        DeviceIcon = Smartphone;
    } else if (lowerDevice.includes('tablet') || lowerDevice.includes('ipad')) {
        DeviceIcon = Tablet;
    }

    const timeAgo = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return Math.floor(seconds) + " secs ago";
    };

    return (
        <div className={`p-4 rounded-xl border ${isCurrent ? 'bg-blue-900/10 border-[#4f46e5]/30' : 'bg-[#eef1f8] border-[#d0d7e8]/50'} flex justify-between items-center transition-colors hover:bg-[#f4f6fb]`}>
            <div className="flex gap-4 items-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-blue-500/20 text-[#4f46e5]' : 'bg-[#dde2f0] text-[#7a87a8]'}`}>
                    <DeviceIcon className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-[#0f1623] font-medium flex items-center gap-2">
                        {browserName} on {osName}
                        {isCurrent && <span className="bg-blue-500/20 text-[#4f46e5] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
                    </h4>
                    <div className="mt-1 flex gap-3 text-xs text-[#7a87a8]">
                        <span className="flex flex-row gap-1 items-center"><Globe className="w-3 h-3" /> {ipAddress}</span>
                        <span className="flex flex-row gap-1 items-center"><Clock className="w-3 h-3" /> Active {timeAgo(session.lastActiveAt || session.createdAt)}</span>
                    </div>
                </div>
            </div>
            {!isCurrent && (
                <button
                    onClick={() => onRevoke(session.id)}
                    disabled={isRevoking}
                    className="p-2 text-[#7a87a8] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Revoke Session"
                >
                    <ShieldX className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}


