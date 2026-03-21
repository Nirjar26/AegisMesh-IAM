import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacAPI } from '../../services/api';
import PolicyBadge from '../../components/PolicyBadge';

export default function RoleDetail() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [selectedPolicy, setSelectedPolicy] = useState('');

    const { data: roleData, isLoading: roleLoading } = useQuery({
        queryKey: ['role', id],
        queryFn: () => rbacAPI.getRole(id),
    });

    const { data: policiesData } = useQuery({
        queryKey: ['policies'],
        queryFn: () => rbacAPI.getPolicies({ limit: 100 }),
    });

    const attachMutation = useMutation({
        mutationFn: (policyId) => rbacAPI.attachPolicyToRole(id, policyId),
        onSuccess: () => queryClient.invalidateQueries(['role', id]),
    });

    const detachMutation = useMutation({
        mutationFn: (policyId) => rbacAPI.detachPolicyFromRole(id, policyId),
        onSuccess: () => queryClient.invalidateQueries(['role', id]),
    });

    const role = roleData?.data?.data;
    const policies = policiesData?.data?.data || [];

    if (roleLoading) return <div className="p-8 text-center text-[#7a87a8]">Loading role details...</div>;
    if (!role) return <div className="p-8 text-center text-red-400">Role not found</div>;

    const attachedPolicyIds = new Set(role.rolePolicies?.map(rp => rp.policy.id));
    const availablePolicies = policies.filter(p => !attachedPolicyIds.has(p.id));

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-[#ffffff] min-h-screen">
            <div className="mb-6">
                <Link to="/dashboard/roles" className="text-[#7a87a8] hover:text-[#0f1623] mb-4 inline-block">&larr; Back to Roles</Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-[#0f1623] font-mono">{role.name}</h1>
                    {role.isSystem && <span className="bg-[#dde2f0] text-[#3a4560] text-xs px-2 py-1 rounded uppercase font-bold tracking-wider relative top-0.5">System</span>}
                </div>
                <p className="text-[#7a87a8] mt-2 text-lg">{role.description || 'No description provided.'}</p>
                <div className="text-sm text-gray-600 mt-4">Role ARN: arn:aws:iam::account:role/{role.name}</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                {/* Policies Tab */}
                <div className="bg-[#f4f6fb] rounded-lg p-6 border border-[#d0d7e8]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-medium text-[#0f1623]">Permissions</h2>
                        <span className="bg-blue-900/30 text-[#4f46e5] px-3 py-1 rounded-full text-sm font-medium border border-blue-800/50">{role.rolePolicies.length} Policies</span>
                    </div>

                    <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-lg p-4 mb-6">
                        <label className="block text-sm font-medium text-[#7a87a8] mb-2">Attach Additional Policy</label>
                        <div className="flex gap-3">
                            <select
                                value={selectedPolicy}
                                onChange={(e) => setSelectedPolicy(e.target.value)}
                                className="flex-1 bg-[#f4f6fb] border border-[#d0d7e8] rounded p-2.5 text-[#0f1623]"
                            >
                                <option value="">-- Select a policy --</option>
                                {availablePolicies.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.effect})</option>
                                ))}
                            </select>
                            <button
                                disabled={!selectedPolicy || attachMutation.isPending}
                                onClick={() => attachMutation.mutate(selectedPolicy)}
                                className="bg-[#4f46e5] hover:bg-[#3730a3] text-white font-medium py-2.5 px-6 rounded transition-colors disabled:opacity-50"
                            >
                                Attach
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {role.rolePolicies.length === 0 ? (
                            <div className="text-center py-8 text-[#7a87a8] border border-dashed border-[#d0d7e8] rounded bg-[#f4f6fb]">
                                No policies attached to this role.
                            </div>
                        ) : role.rolePolicies.map(({ policy }) => (
                            <div key={policy.id} className="bg-[#ffffff] border border-[#d0d7e8] rounded-lg p-4 flex items-start justify-between group">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <Link to={`/dashboard/policies/${policy.id}`} className="text-[#4f46e5] hover:underline font-medium text-sm">{policy.name}</Link>
                                        <PolicyBadge effect={policy.effect} />
                                    </div>
                                    <p className="text-[#7a87a8] text-xs mt-1">{policy.description}</p>
                                    <div className="text-[10px] uppercase font-mono tracking-widest text-gray-600 mt-2">Actions: {policy.actions.length} • Resources: {policy.resources.length}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Detach ${policy.name}?`)) detachMutation.mutate(policy.id);
                                    }}
                                    className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-red-400/10 rounded"
                                >
                                    Detach
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Users Tab */}
                <div className="bg-[#f4f6fb] rounded-lg p-6 border border-[#d0d7e8] h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-medium text-[#0f1623]">Assigned Users</h2>
                        <span className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-sm font-medium border border-purple-800/50">{role.userRoles.length} Users</span>
                    </div>

                    <div className="bg-[#ffffff] border border-[#d0d7e8] rounded overflow-hidden">
                        {role.userRoles.length === 0 ? (
                            <div className="text-center py-6 text-[#7a87a8]">No users have this role directly assigned.</div>
                        ) : (
                            <ul className="divide-y divide-gray-800">
                                {role.userRoles.map(({ user }) => (
                                    <li key={user.id} className="p-4 flex justify-between items-center hover:bg-[#eef1f8]">
                                        <div>
                                            <div className="text-[#0f1623] text-sm font-medium">{user.firstName} {user.lastName}</div>
                                            <div className="text-[#7a87a8] text-xs">{user.email}</div>
                                        </div>
                                        <Link to={`/dashboard/users/${user.id}/permissions`} className="text-[#4f46e5] text-xs font-medium bg-blue-400/10 px-3 py-1.5 rounded hover:bg-blue-400/20 transition-colors">
                                            View Permissions
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <p className="text-xs text-[#7a87a8] mt-4 text-center">Note: Users can also inherit this role via group membership. That is not shown here.</p>
                </div>
            </div>
        </div>
    );
}


