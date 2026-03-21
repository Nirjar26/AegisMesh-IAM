import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { rbacAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PermissionChecker({ userId }) {
    const [action, setAction] = useState('users/read');
    const [resource, setResource] = useState('system');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleCheck = async () => {
        if (!action || !resource) {
            toast.error('Action and Resource are required');
            return;
        }

        setLoading(true);
        try {
            const res = await rbacAPI.simulatePolicy({
                userId,
                action,
                resource
            });
            setResult(res.data?.data);
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to check permissions');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f4f6fb] rounded-lg p-5 border border-[#d0d7e8]">
            <h3 className="text-[#0f1623] font-medium mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4f46e5]" />
                Permission Simulator
            </h3>

            <div className="flex gap-3 mb-4 flex-col sm:flex-row">
                <div className="flex-1">
                    <label className="block text-xs text-[#7a87a8] font-medium mb-1">Action</label>
                    <input
                        type="text"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        placeholder="e.g. auth/login"
                        className="w-full bg-[#ffffff] border border-[#d0d7e8] rounded-lg p-2 text-[#0f1623] text-sm"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-[#7a87a8] font-medium mb-1">Resource</label>
                    <input
                        type="text"
                        value={resource}
                        onChange={(e) => setResource(e.target.value)}
                        placeholder="e.g. api/users"
                        className="w-full bg-[#ffffff] border border-[#d0d7e8] rounded-lg p-2 text-[#0f1623] text-sm"
                    />
                </div>
                <div className="flex items-end pt-1">
                    <button
                        onClick={handleCheck}
                        disabled={loading || !action || !resource}
                        className="w-full sm:w-auto px-6 py-2 bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Checking...' : 'Check'}
                    </button>
                </div>
            </div>

            {result && (
                <div className={`p-4 rounded-lg flex items-start gap-3 mt-4 border ${result.allowed ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    {result.allowed ? (
                        <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <h4 className={`font-medium ${result.allowed ? 'text-green-400' : 'text-red-400'}`}>
                            {result.allowed ? 'Access Allowed' : 'Access Denied'}
                        </h4>
                        <p className="text-sm text-[#3a4560] mt-1">
                            {result.reason || 'No specific reason provided by the system.'}
                        </p>
                        {result.matchedPolicies && result.matchedPolicies.length > 0 && (
                            <div className="mt-2 text-xs">
                                <span className="text-[#7a87a8]">Matched Policy: </span>
                                <span className="text-[#3a4560] bg-[#ffffff] px-2 py-0.5 rounded border border-[#d0d7e8] font-mono">
                                    {result.matchedPolicies[0]?.name || result.matchedPolicies[0]?.id || 'Unknown Policy'}
                                </span>
                            </div>
                        )}
                        {result.deniedBy && (
                            <div className="mt-2 text-xs">
                                <span className="text-[#7a87a8]">Denied By Policy: </span>
                                <span className="text-red-300 bg-red-900/30 px-2 py-0.5 rounded border border-red-900/50 font-mono">
                                    {result.deniedBy.name || result.deniedBy.id || 'Unknown Policy'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}


