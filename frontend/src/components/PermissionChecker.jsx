import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { rbacAPI } from '../services/api';

export default function PermissionChecker({ userId }) {
    const [action, setAction] = useState('users:read');
    const [resource, setResource] = useState('users/*');

    const { mutate, data, isPending } = useMutation({
        mutationFn: (payload) => rbacAPI.simulatePolicy(payload),
    });

    const handleCheck = (e) => {
        e.preventDefault();
        mutate({ userId, action, resource });
    };

    const result = data?.data?.data;

    return (
        <div className="bg-[#f4f6fb] p-4 rounded-lg border border-[#d0d7e8]">
            <h3 className="text-lg font-medium text-[#0f1623] mb-4">Policy Simulator</h3>
            <form onSubmit={handleCheck} className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-[#7a87a8] mb-1">Action</label>
                    <input
                        type="text"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#d0d7e8] rounded p-2 text-[#0f1623] focus:outline-none focus:border-[#4f46e5]"
                        placeholder="e.g. users:read"
                        required
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-[#7a87a8] mb-1">Resource</label>
                    <input
                        type="text"
                        value={resource}
                        onChange={(e) => setResource(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#d0d7e8] rounded p-2 text-[#0f1623] focus:outline-none focus:border-[#4f46e5]"
                        placeholder="e.g. users/*"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isPending}
                    className="bg-[#4f46e5] hover:bg-[#3730a3] text-white font-medium py-2 px-6 rounded transition-colors disabled:opacity-50 h-[42px]"
                >
                    {isPending ? 'Checking...' : 'Check Permission'}
                </button>
            </form>

            {result && (
                <div className={`mt-6 p-4 rounded border ${result.allowed ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{result.allowed ? '✅' : '❌'}</span>
                        <h4 className={`text-lg font-medium ${result.allowed ? 'text-green-400' : 'text-red-400'}`}>
                            {result.allowed ? 'Allowed' : 'Denied'}
                        </h4>
                    </div>
                    <p className="text-[#3a4560] ml-8 mb-3">{result.reason}</p>

                    {result.matchedPolicies?.length > 0 && (
                        <div className="ml-8 mt-4 pt-4 border-t border-[#d0d7e8]">
                            <span className="text-sm text-[#7a87a8] block mb-2">Matched Policies:</span>
                            <ul className="space-y-1">
                                {result.matchedPolicies.map(p => (
                                    <li key={p.id} className="text-sm text-[#3a4560] flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${p.effect === 'ALLOW' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {p.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


