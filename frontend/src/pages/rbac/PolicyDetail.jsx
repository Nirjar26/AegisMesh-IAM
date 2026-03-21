import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rbacAPI } from '../../services/api';
import PolicyBadge from '../../components/PolicyBadge';

export default function PolicyDetail() {
    const { id } = useParams();

    const { data: policyData, isLoading } = useQuery({
        queryKey: ['policy', id],
        queryFn: () => rbacAPI.getPolicy(id),
    });

    const policy = policyData?.data?.data;
    const policyCode = policy ? JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: policy.effect,
                Action: policy.actions,
                Resource: policy.resources
            }
        ]
    }, null, 4) : '';

    if (isLoading) return <div className="p-8 text-center text-[#7a87a8]">Loading policy details...</div>;
    if (!policy) return <div className="p-8 text-center text-red-400">Policy not found</div>;

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-[#ffffff] min-h-screen">
            <div className="mb-6">
                <Link to="/dashboard/policies" className="text-[#7a87a8] hover:text-[#0f1623] mb-4 inline-block">&larr; Back to Policies</Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-[#0f1623] font-mono">{policy.name}</h1>
                    <PolicyBadge effect={policy.effect} />
                    {policy.isSystem && <span className="bg-[#dde2f0] text-[#3a4560] text-xs px-2 py-1 rounded uppercase font-bold tracking-wider relative top-0.5">AWS Managed</span>}
                </div>
                <p className="text-[#7a87a8] mt-2 text-lg">{policy.description || 'No description provided.'}</p>
                <div className="text-sm text-gray-600 mt-4">Policy ARN: arn:aws:iam::account:policy/{policy.name}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                {/* JSON Viewer */}
                <div className="bg-[#f4f6fb] rounded-lg border border-[#d0d7e8] overflow-hidden">
                    <div className="bg-[#ffffff] border-b border-[#d0d7e8] p-4">
                        <h2 className="text-lg font-medium text-[#0f1623]">Policy JSON Document</h2>
                    </div>
                    <div className="p-6 overflow-x-auto text-sm text-[#3a4560] font-mono bg-[#f4f6fb]">
                        <pre><code>{policyCode}</code></pre>
                    </div>
                </div>

                {/* Info / Attached Roles */}
                <div className="space-y-8">
                    <div className="bg-[#f4f6fb] rounded-lg p-6 border border-[#d0d7e8]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-medium text-[#0f1623]">Attached Entities (Roles)</h2>
                            <span className="bg-blue-900/30 text-[#4f46e5] px-3 py-1 rounded-full text-sm font-medium border border-blue-800/50">{policy.rolePolicies.length} Roles</span>
                        </div>

                        <div className="bg-[#ffffff] border border-[#d0d7e8] rounded overflow-hidden">
                            {policy.rolePolicies.length === 0 ? (
                                <div className="text-center py-6 text-[#7a87a8]">Not attached to any roles.</div>
                            ) : (
                                <ul className="divide-y divide-gray-800">
                                    {policy.rolePolicies.map(({ role }) => (
                                        <li key={role.id} className="p-4 flex justify-between items-center hover:bg-[#eef1f8]">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-purple-900/50 text-purple-400 flex items-center justify-center text-xs font-bold border border-purple-500/30">R</div>
                                                <Link to={`/dashboard/roles/${role.id}`} className="text-[#0f1623] hover:text-[#4f46e5] text-sm font-medium transition-colors">{role.name}</Link>
                                            </div>
                                            <Link to={`/dashboard/roles/${role.id}`} className="text-[#4f46e5] text-xs font-medium px-3 py-1.5 rounded hover:bg-blue-900/30 transition-colors">
                                                Manage
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


