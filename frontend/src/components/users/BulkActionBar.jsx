import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    Check,
    CheckCircle,
    CheckSquare,
    Download,
    Loader2,
    Lock,
    Shield,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bulkUsers, rbacAPI } from '../../services/api';

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function getInitials(user) {
    const first = user?.firstName?.[0] || '';
    const last = user?.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'U';
}

function selectedFromIds(ids, users) {
    const byId = new Map((users || []).map((user) => [user.id, user]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
}

function BaseModal({ children, onClose }) {
    return (
        <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm p-0 sm:items-center sm:p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose?.();
                }
            }}
        >
            {children}
        </div>
    );
}

export default function BulkActionBar({ selectedUsers, users, onSuccess, onClear }) {
    const [statusState, setStatusState] = useState('idle');
    const [isLoading, setIsLoading] = useState(false);

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState([]);
    const [roleAction, setRoleAction] = useState('assign');

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [selectedGroupIds, setSelectedGroupIds] = useState([]);
    const [groupAction, setGroupAction] = useState('add');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const selectedCount = selectedUsers.length;
    const selectedUserObjects = useMemo(() => selectedFromIds(selectedUsers, users), [selectedUsers, users]);

    useEffect(() => {
        if (statusState !== 'success') {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setStatusState('idle');
        }, 2000);

        return () => window.clearTimeout(timer);
    }, [statusState]);

    const { data: roles = [] } = useQuery({
        queryKey: ['roles', 'bulk-modal'],
        queryFn: () => rbacAPI.getRoles({ limit: 100 }).then((res) => res.data?.data || []),
        enabled: showRoleModal,
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups', 'bulk-modal'],
        queryFn: () => rbacAPI.getGroups().then((res) => res.data?.data || []),
        enabled: showGroupModal,
    });

    const runAction = async (executor) => {
        setIsLoading(true);
        setStatusState('loading');
        try {
            await executor();
            setStatusState('success');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkStatus = async (newStatus) => {
        await runAction(async () => {
            try {
                const response = await bulkUsers.updateStatus({
                    userIds: selectedUsers,
                    status: newStatus,
                });

                const data = response.data?.data || {};
                toast.success(
                    `${data.succeeded || 0} users ${newStatus === 'ACTIVE' ? 'activated' : newStatus === 'LOCKED' ? 'locked' : 'updated'}${(data.skipped || 0) > 0 ? `. ${data.skipped} skipped.` : ''}`
                );
                onSuccess?.();
            } catch {
                toast.error('Bulk update failed');
                throw new Error('bulk-status-failed');
            }
        });
    };

    const handleExport = async () => {
        await runAction(async () => {
            try {
                const response = await bulkUsers.export({
                    userIds: selectedUsers,
                    format: 'csv',
                });

                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                URL.revokeObjectURL(url);

                toast.success(`${selectedUsers.length} users exported`);
            } catch {
                toast.error('Export failed');
                throw new Error('bulk-export-failed');
            }
        });
    };

    const applyRoles = async () => {
        if (selectedRoleIds.length === 0) {
            toast.error('Select at least one role');
            return;
        }

        await runAction(async () => {
            try {
                await bulkUsers.assignRoles({
                    userIds: selectedUsers,
                    roleIds: selectedRoleIds,
                    action: roleAction,
                });

                toast.success(`Roles ${roleAction}ed for ${selectedUsers.length} users`);
                setShowRoleModal(false);
                setSelectedRoleIds([]);
                onSuccess?.();
            } catch {
                toast.error('Failed to update roles');
                throw new Error('bulk-role-failed');
            }
        });
    };

    const applyGroups = async () => {
        if (selectedGroupIds.length === 0) {
            toast.error('Select at least one group');
            return;
        }

        await runAction(async () => {
            try {
                await bulkUsers.assignGroups({
                    userIds: selectedUsers,
                    groupIds: selectedGroupIds,
                    action: groupAction,
                });

                toast.success(`Groups ${groupAction === 'add' ? 'added' : 'removed'} for ${selectedUsers.length} users`);
                setShowGroupModal(false);
                setSelectedGroupIds([]);
                onSuccess?.();
            } catch {
                toast.error('Failed to update groups');
                throw new Error('bulk-group-failed');
            }
        });
    };

    const applyDelete = async () => {
        if (confirmText !== 'DELETE') {
            toast.error('Type DELETE to confirm');
            return;
        }

        await runAction(async () => {
            try {
                await bulkUsers.delete({
                    userIds: selectedUsers,
                    confirmPhrase: confirmText,
                });

                toast.success(`${selectedUsers.length} users deleted`);
                setShowDeleteModal(false);
                setConfirmText('');
                onSuccess?.();
            } catch {
                toast.error('Failed to delete selected users');
                throw new Error('bulk-delete-failed');
            }
        });
    };

    const roleCoverage = useMemo(() => {
        const coverage = new Map();
        roles.forEach((role) => {
            let count = 0;
            selectedUserObjects.forEach((user) => {
                const hasRole = (user.userRoles || []).some((assignment) => assignment.roleId === role.id || assignment.role?.id === role.id);
                if (hasRole) {
                    count += 1;
                }
            });
            coverage.set(role.id, count);
        });
        return coverage;
    }, [roles, selectedUserObjects]);

    const renderStatus = () => {
        if (statusState === 'loading') {
            return (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                    Processing...
                </div>
            );
        }

        if (statusState === 'success') {
            return (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle size={16} className="text-emerald-400" />
                    Done!
                </div>
            );
        }

        return null;
    };

    return (
        <>
            <div
                className="fixed bottom-4 left-4 right-4 z-50 pointer-events-auto flex flex-wrap items-center gap-2 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f172a] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-[12px] animate-slide-up sm:left-1/2 sm:right-auto sm:max-w-[96vw] sm:-translate-x-1/2"
            >
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <CheckSquare size={14} className="text-indigo-400" />
                    <span className="text-[12px] font-semibold text-white">{selectedCount} users selected</span>
                    <span className="mx-1 hidden h-4 w-px bg-white/15 sm:block" />
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-[11px] text-white/40 hover:text-white/80 cursor-pointer bg-transparent border-0 p-0 transition-colors"
                    >
                        Clear
                    </button>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:flex-1 sm:justify-center">
                    <button
                        type="button"
                        onClick={() => handleBulkStatus('ACTIVE')}
                        disabled={isLoading}
                        className="min-h-11 text-[11px] font-medium rounded-[8px] px-3 py-2 flex items-center gap-[5px] cursor-pointer transition-all duration-150 border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.12)] text-[#34d399] hover:bg-[rgba(16,185,129,0.2)] disabled:opacity-60 disabled:cursor-not-allowed sm:min-h-0 sm:py-1.5"
                    >
                        <CheckCircle size={12} />
                        Activate
                    </button>

                    <button
                        type="button"
                        onClick={() => handleBulkStatus('LOCKED')}
                        disabled={isLoading}
                        className="min-h-11 text-[11px] font-medium rounded-[8px] px-3 py-2 flex items-center gap-[5px] cursor-pointer transition-all duration-150 border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.12)] text-[#fbbf24] hover:bg-[rgba(245,158,11,0.2)] disabled:opacity-60 disabled:cursor-not-allowed sm:min-h-0 sm:py-1.5"
                    >
                        <Lock size={12} />
                        Lock
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowRoleModal(true)}
                        disabled={isLoading}
                        className="min-h-11 text-[11px] font-medium rounded-[8px] px-3 py-2 flex items-center gap-[5px] cursor-pointer transition-all duration-150 border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.12)] text-[#818cf8] hover:bg-[rgba(99,102,241,0.2)] disabled:opacity-60 disabled:cursor-not-allowed sm:min-h-0 sm:py-1.5"
                    >
                        <Shield size={12} />
                        Assign Role
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowGroupModal(true)}
                        disabled={isLoading}
                        className="min-h-11 text-[11px] font-medium rounded-[8px] px-3 py-2 flex items-center gap-[5px] cursor-pointer transition-all duration-150 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.12)] text-[#60a5fa] hover:bg-[rgba(59,130,246,0.2)] disabled:opacity-60 disabled:cursor-not-allowed sm:min-h-0 sm:py-1.5"
                    >
                        <Users size={12} />
                        Add to Group
                    </button>

                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={isLoading}
                        className="min-h-11 text-[11px] font-medium rounded-[8px] px-3 py-2 flex items-center gap-[5px] cursor-pointer transition-all duration-150 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] disabled:opacity-60 disabled:cursor-not-allowed sm:min-h-0 sm:py-1.5"
                    >
                        <Download size={12} />
                        Export
                    </button>

                    <span className="mx-0.5 hidden h-4 w-px bg-white/15 sm:block" />

                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={isLoading}
                        className="min-h-11 text-[11px] font-medium rounded-[8px] px-3 py-2 flex items-center gap-[5px] cursor-pointer transition-all duration-150 border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.12)] text-[#f87171] hover:bg-[rgba(239,68,68,0.2)] disabled:opacity-60 disabled:cursor-not-allowed sm:min-h-0 sm:py-1.5"
                    >
                        <Trash2 size={12} />
                        Delete
                    </button>
                </div>

                <div className="flex w-full justify-start sm:w-24 sm:justify-end">{renderStatus()}</div>
            </div>

            {showRoleModal ? (
                <BaseModal
                    onClose={() => {
                        if (!isLoading) {
                            setShowRoleModal(false);
                        }
                    }}
                >
                    <div className="mx-4 w-full max-w-md rounded-t-[20px] bg-white p-6 shadow-2xl sm:mx-0 sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Shield size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Manage Roles for {selectedCount} users</h3>
                                <p className="text-xs text-slate-500">Choose roles to assign or remove.</p>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 mb-4">
                            {['assign', 'remove'].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setRoleAction(value)}
                                    className={classNames(
                                        'px-3 py-2 text-sm border-b-2 font-medium',
                                        roleAction === value
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-600'
                                            : 'text-slate-500 border-transparent hover:text-slate-700'
                                    )}
                                >
                                    {value === 'assign' ? 'Assign' : 'Remove'}
                                </button>
                            ))}
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                            {roles.length === 0 ? <p className="text-sm text-slate-500 px-2 py-3">No roles found</p> : null}
                            {roles.map((role) => {
                                const checked = selectedRoleIds.includes(role.id);
                                const selectedCoverage = roleCoverage.get(role.id) || 0;
                                return (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedRoleIds((current) => {
                                                if (current.includes(role.id)) {
                                                    return current.filter((id) => id !== role.id);
                                                }
                                                return [...current, role.id];
                                            });
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer text-left"
                                    >
                                        <div className={classNames('w-4 h-4 rounded border flex items-center justify-center', checked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300')}>
                                            {checked ? <Check size={11} className="text-white" /> : null}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">{role.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{role.description || 'No description provided'}</p>
                                        </div>

                                        {roleAction === 'assign' ? (
                                            <span className="text-xs text-slate-400">{selectedCoverage}/{selectedCount} have this</span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowRoleModal(false)}
                                className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyRoles}
                                className="px-4 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Applying...' : `Apply to ${selectedCount} users`}
                            </button>
                        </div>
                    </div>
                </BaseModal>
            ) : null}

            {showGroupModal ? (
                <BaseModal
                    onClose={() => {
                        if (!isLoading) {
                            setShowGroupModal(false);
                        }
                    }}
                >
                    <div className="mx-4 w-full max-w-md rounded-t-[20px] bg-white p-6 shadow-2xl sm:mx-0 sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Users size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Manage Groups for {selectedCount} users</h3>
                                <p className="text-xs text-slate-500">Choose groups to add or remove.</p>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 mb-4">
                            {['add', 'remove'].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setGroupAction(value)}
                                    className={classNames(
                                        'px-3 py-2 text-sm border-b-2 font-medium',
                                        groupAction === value
                                            ? 'bg-blue-50 text-blue-700 border-blue-600'
                                            : 'text-slate-500 border-transparent hover:text-slate-700'
                                    )}
                                >
                                    {value === 'add' ? 'Add' : 'Remove'}
                                </button>
                            ))}
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                            {groups.length === 0 ? <p className="text-sm text-slate-500 px-2 py-3">No groups found</p> : null}
                            {groups.map((group) => {
                                const checked = selectedGroupIds.includes(group.id);
                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedGroupIds((current) => {
                                                if (current.includes(group.id)) {
                                                    return current.filter((id) => id !== group.id);
                                                }
                                                return [...current, group.id];
                                            });
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer text-left"
                                    >
                                        <div className={classNames('w-4 h-4 rounded border flex items-center justify-center', checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300')}>
                                            {checked ? <Check size={11} className="text-white" /> : null}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">{group.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{group.description || 'No description provided'}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowGroupModal(false)}
                                className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyGroups}
                                className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Applying...' : `Apply to ${selectedCount} users`}
                            </button>
                        </div>
                    </div>
                </BaseModal>
            ) : null}

            {showDeleteModal ? (
                <BaseModal
                    onClose={() => {
                        if (!isLoading) {
                            setShowDeleteModal(false);
                            setConfirmText('');
                        }
                    }}
                >
                    <div className="mx-4 w-full max-w-md rounded-t-[20px] bg-white p-6 shadow-2xl sm:mx-0 sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="rounded-full p-3 bg-red-50 text-red-600">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-slate-900">Delete {selectedCount} Users Permanently</h3>
                            <p className="text-sm text-slate-500">This action cannot be undone.</p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 my-4 max-h-40 overflow-y-auto">
                            {selectedUserObjects.slice(0, 5).map((user) => (
                                <div key={user.id} className="flex items-center gap-2 py-1">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center justify-center">
                                        {getInitials(user)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{user.firstName} {user.lastName}</p>
                                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                    </div>
                                </div>
                            ))}

                            {selectedCount > 5 ? (
                                <p className="text-xs text-slate-400 italic mt-1">and {selectedCount - 5} more users...</p>
                            ) : null}
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                            All sessions, API keys, and role assignments will be permanently deleted.
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type DELETE to confirm</label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(event) => setConfirmText(event.target.value)}
                                placeholder="DELETE"
                                className={classNames(
                                    'w-full rounded-xl px-3 py-2 text-sm border outline-none transition-colors',
                                    confirmText.length === 0
                                        ? 'border-slate-300 focus:border-slate-400'
                                        : confirmText === 'DELETE'
                                            ? 'border-emerald-300 focus:border-emerald-400'
                                            : 'border-red-300 focus:border-red-400'
                                )}
                            />
                        </div>

                        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setConfirmText('');
                                }}
                                className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyDelete}
                                disabled={confirmText !== 'DELETE' || isLoading}
                                className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Deleting...' : `Delete ${selectedCount} Users`}
                            </button>
                        </div>
                    </div>
                </BaseModal>
            ) : null}
        </>
    );
}
