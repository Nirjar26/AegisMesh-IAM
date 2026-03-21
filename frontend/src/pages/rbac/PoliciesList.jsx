import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    FileText,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rbacAPI } from '../../services/api';

const EMPTY_POLICIES = [];

export default function PoliciesList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [effectFilter, setEffectFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [effect, setEffect] = useState('ALLOW');
    const [actionsJson, setActionsJson] = useState('["*:*"]');
    const [resourcesJson, setResourcesJson] = useState('["*"]');
    const [formErrors, setFormErrors] = useState({});

    const { data: policiesData, isLoading, isError } = useQuery({
        queryKey: ['policies', search, effectFilter],
        queryFn: () => rbacAPI.getPolicies({ search, effect: effectFilter }),
    });

    const createMutation = useMutation({
        mutationFn: (data) => rbacAPI.createPolicy(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['policies']);
            setName('');
            setDescription('');
            setEffect('ALLOW');
            setActionsJson('["*:*"]');
            setResourcesJson('["*"]');
            setFormErrors({});
            setIsCreateOpen(false);
            toast.success('Policy created successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to create policy');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => rbacAPI.deletePolicy(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['policies']);
            toast.success('Policy deleted');
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to delete policy');
        },
    });

    const policies = policiesData?.data?.data ?? EMPTY_POLICIES;

    const filteredPolicies = useMemo(() => {
        if (!typeFilter) return policies;
        if (typeFilter === 'SYSTEM') return policies.filter((p) => p.isSystem);
        return policies.filter((p) => !p.isSystem);
    }, [policies, typeFilter]);

    const total = filteredPolicies.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, total);
    const visiblePolicies = filteredPolicies.slice(startIndex, endIndex);

    const parseJsonArray = (value, fieldLabel) => {
        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                return { error: `${fieldLabel} must be a non-empty JSON array`, value: [] };
            }
            const hasInvalid = parsed.some((item) => typeof item !== 'string' || !item.trim());
            if (hasInvalid) {
                return { error: `${fieldLabel} entries must be non-empty strings`, value: [] };
            }
            return { error: null, value: parsed };
        } catch {
            return { error: `${fieldLabel} must be valid JSON`, value: [] };
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();

        const nextErrors = {};
        if (!name.trim()) {
            nextErrors.name = 'Policy name is required';
        }

        const parsedActions = parseJsonArray(actionsJson, 'Actions');
        const parsedResources = parseJsonArray(resourcesJson, 'Resources');

        if (parsedActions.error) nextErrors.actions = parsedActions.error;
        if (parsedResources.error) nextErrors.resources = parsedResources.error;

        setFormErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        createMutation.mutate({
            name: name.trim(),
            description: description.trim(),
            effect,
            actions: parsedActions.value,
            resources: parsedResources.value,
        });
    };

    const handleDelete = (policy) => {
        if (policy.isSystem) return;
        if (window.confirm(`Are you sure you want to delete "${policy.name}"?`)) {
            deleteMutation.mutate(policy.id);
        }
    };

    const handleCloseModal = () => {
        setIsCreateOpen(false);
        setFormErrors({});
    };

    return (
        <>
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Policies</h1>
                        <p className="text-[13px] text-[#7a87a8] mt-1">
                            Author and attach policies that control resource access.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <Plus size={15} />
                        + New Policy
                    </button>
                </div>

                <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 mb-4 flex items-center gap-3 shadow-sm flex-wrap lg:flex-nowrap">
                    <div className="relative flex-1 min-w-[260px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search policies..."
                            className="w-full border border-[#d0d7e8] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#0f1623] placeholder:text-[#7a87a8] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={effectFilter}
                            onChange={(e) => {
                                setEffectFilter(e.target.value);
                                setPage(1);
                            }}
                            className="appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-4 py-2.5 pr-8 text-sm text-[#3a4560] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                        >
                            <option value="">All Effects</option>
                            <option value="ALLOW">Allow</option>
                            <option value="DENY">Deny</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-4 py-2.5 pr-8 text-sm text-[#3a4560] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                        >
                            <option value="">All Types</option>
                            <option value="SYSTEM">AWS Managed</option>
                            <option value="CUSTOM">Custom</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                    </div>
                </div>

                <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="py-16 text-center text-sm text-[#7a87a8]">Loading policies...</div>
                    ) : isError ? (
                        <div className="py-16 text-center text-sm text-red-500">Failed to load policies.</div>
                    ) : visiblePolicies.length === 0 ? (
                        <div className="py-16 flex flex-col items-center gap-3 text-center px-4">
                            <div className="bg-[#f4f6fb] rounded-2xl p-4 inline-flex">
                                <FileText size={28} className="text-[#7a87a8]" />
                            </div>
                            <p className="text-[15px] font-semibold text-[#0f1623]">No policies found</p>
                            <p className="text-[13px] text-[#7a87a8]">Try different filters or create a new policy.</p>
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="mt-1 bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                            >
                                + New Policy
                            </button>
                        </div>
                    ) : (
                        <>
                            <table className="w-full border-collapse table-fixed">
                                <colgroup>
                                    <col style={{ width: '40%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '15%' }} />
                                    <col style={{ width: '15%' }} />
                                </colgroup>
                                <thead>
                                    <tr className="h-10 border-b border-[#e2e8f0] bg-[#f8fafc]">
                                        <th className="h-10 px-4 text-left align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">POLICY</th>
                                        <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">TYPE</th>
                                        <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">EFFECT</th>
                                        <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">SCOPE</th>
                                        <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visiblePolicies.map((policy) => (
                                        <tr
                                            key={policy.id}
                                            className="h-16 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors duration-100"
                                        >
                                            <td className="h-16 px-4 align-middle overflow-hidden">
                                                <div className="flex items-center gap-3 h-16 min-w-0">
                                                    <div className="w-[34px] h-[34px] rounded-[9px] bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shrink-0">
                                                        <FileText size={15} />
                                                    </div>
                                                    <div className="min-w-0 flex flex-col gap-0.5 overflow-hidden">
                                                        <p className="text-[13px] font-semibold text-[#0f172a] whitespace-nowrap overflow-hidden text-ellipsis">{policy.name}</p>
                                                        <p className="text-[11px] text-[#94a3b8] whitespace-nowrap overflow-hidden text-ellipsis">
                                                            {policy.description || 'No description provided'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                                <span className={`inline-flex items-center justify-center rounded-[20px] px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap ${policy.isSystem ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                                                    {policy.isSystem ? 'AWS Managed' : 'Custom'}
                                                </span>
                                            </td>

                                            <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                                <span className={`inline-flex items-center justify-center rounded-[20px] px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap ${policy.effect === 'ALLOW' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                                                    {policy.effect === 'ALLOW' ? 'Allow' : 'Deny'}
                                                </span>
                                            </td>

                                            <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <p className="text-[12px] text-[#374151] font-medium">Actions: {policy.actions?.length || 0}</p>
                                                    <p className="text-[12px] text-[#94a3b8]">Attached: {policy._count?.rolePolicies || 0} roles</p>
                                                </div>
                                            </td>

                                            <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                                <div className="flex items-center justify-center gap-[6px]">
                                                    <Link
                                                        to={`/dashboard/policies/${policy.id}`}
                                                        className="w-7 h-7 rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#0ea5e9] hover:text-[#0ea5e9] hover:bg-[#f0f9ff]"
                                                        title="View"
                                                    >
                                                        <Eye size={13} />
                                                    </Link>
                                                    <button
                                                        onClick={() => navigate(`/dashboard/policies/${policy.id}`)}
                                                        className="w-7 h-7 rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#6366f1] hover:text-[#6366f1] hover:bg-[#eef2ff]"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(policy)}
                                                        disabled={policy.isSystem || deleteMutation.isPending}
                                                        className="w-7 h-7 rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#fca5a5] hover:text-[#ef4444] hover:bg-[#fef2f2] disabled:opacity-40 disabled:cursor-not-allowed"
                                                        title={policy.isSystem ? 'AWS managed policies cannot be deleted' : 'Delete'}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="px-6 py-4 border-t border-[#f0f2f8] flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-[#7a87a8]">
                                    Showing {total === 0 ? 0 : startIndex + 1}-{endIndex} of {total} policies
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                        disabled={safePage === 1}
                                        className="border border-[#d0d7e8] rounded-lg p-1.5 text-[#7a87a8] hover:bg-[#f4f6fb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="bg-[#4f46e5] text-white text-xs px-3 py-1.5 rounded-lg">{safePage}</span>
                                    <button
                                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={safePage >= totalPages}
                                        className="border border-[#d0d7e8] rounded-lg p-1.5 text-[#7a87a8] hover:bg-[#f4f6fb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-[#7a87a8]">
                                    Per page
                                    <div className="relative">
                                        <select
                                            value={perPage}
                                            onChange={(e) => {
                                                setPerPage(Number(e.target.value));
                                                setPage(1);
                                            }}
                                            className="appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-3 py-1.5 pr-6 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isCreateOpen && (
                <div
                    className="fixed inset-0 bg-[#0f1623]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCloseModal();
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[94vh] flex flex-col">
                        <div className="px-5 py-3 border-b border-[#f0f2f8] flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="bg-[#4f46e5]/10 rounded-xl p-1.5 text-[#4f46e5] mr-2.5">
                                    <FileText size={16} />
                                </div>
                                <h2 className="text-[15px] font-semibold text-[#0f1623]">Create Policy</h2>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="text-[#7a87a8] hover:text-[#0f1623] p-1 rounded-lg hover:bg-[#f4f6fb] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="flex flex-col">
                            <div className="px-5 py-3 space-y-3 text-[12px]">
                                <div>
                                    <label className="text-[11px] font-semibold text-[#3a4560] mb-1 block uppercase tracking-wide">Policy Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. EC2FullAccess"
                                        className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                                    />
                                    {formErrors.name && <p className="text-xs text-[#dc2626] mt-1">{formErrors.name}</p>}
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-[#3a4560] mb-1 block uppercase tracking-wide">Description</label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe what this policy grants"
                                        className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-[#3a4560] mb-1 block uppercase tracking-wide">Effect</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEffect('ALLOW')}
                                            className={`border-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${effect === 'ALLOW'
                                                ? 'border-[#16a34a] bg-[#16a34a]/6 text-[#16a34a]'
                                                : 'border-[#d0d7e8] text-[#7a87a8] hover:border-[#b8c2d8]'
                                                }`}
                                        >
                                            ALLOW
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEffect('DENY')}
                                            className={`border-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${effect === 'DENY'
                                                ? 'border-[#dc2626] bg-[#dc2626]/6 text-[#dc2626]'
                                                : 'border-[#d0d7e8] text-[#7a87a8] hover:border-[#b8c2d8]'
                                                }`}
                                        >
                                            DENY
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-semibold text-[#3a4560] mb-1 block uppercase tracking-wide">Actions</label>
                                        <textarea
                                            rows={2}
                                            value={actionsJson}
                                            onChange={(e) => setActionsJson(e.target.value)}
                                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                                        />
                                        <p className="text-[11px] text-[#7a87a8] mt-1">JSON array, e.g. ["s3:GetObject"]</p>
                                        {formErrors.actions && <p className="text-xs text-[#dc2626] mt-1">{formErrors.actions}</p>}
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-semibold text-[#3a4560] mb-1 block uppercase tracking-wide">Resources</label>
                                        <textarea
                                            rows={2}
                                            value={resourcesJson}
                                            onChange={(e) => setResourcesJson(e.target.value)}
                                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                                        />
                                        <p className="text-[11px] text-[#7a87a8] mt-1">JSON array, e.g. ["*"]</p>
                                        {formErrors.resources && <p className="text-xs text-[#dc2626] mt-1">{formErrors.resources}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-2.5 border-t border-[#f0f2f8] flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="border border-[#d0d7e8] text-[#3a4560] hover:bg-[#f4f6fb] rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="bg-[#4f46e5] hover:bg-[#3730a3] text-white rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}


