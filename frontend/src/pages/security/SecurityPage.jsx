import { createElement, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    AppWindow,
    Eye,
    EyeOff,
    Lock,
    Monitor,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConnectedApps from '../../components/security/ConnectedApps';
import ReauthModal from '../../components/security/ReauthModal';
import SecurityScore from '../../components/security/SecurityScore';
import { useAuth } from '../../context/AuthContext';
import { useReauth } from '../../hooks/useReauth';
import { connectedAppsAPI, settingsAPI } from '../../services/api';
import { daysSince as getDaysSince } from '../../utils/securityScore';

const SECURITY_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'password', label: 'Password' },
    { id: 'mfa', label: 'Two-Factor Auth' },
    { id: 'devices', label: 'Trusted Devices' },
    { id: 'connected-apps', label: 'Connected Apps' },
];

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function formatRelative(value) {
    if (!value) return 'Unknown';

    const now = Date.now();
    const ts = new Date(value).getTime();
    const diffMs = Math.max(0, now - ts);
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function formatPasswordAge(value, hasPassword) {
    if (!value) {
        return hasPassword === false ? 'Managed by external login' : 'Never changed';
    }

    const days = getDaysSince(value);
    if (!Number.isFinite(days)) return 'Never changed';
    if (days <= 0) return 'Last changed today';
    return `Last changed ${days} day${days === 1 ? '' : 's'} ago`;
}

function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z\d\s]/.test(password)) score += 1;

    if (score <= 2) return { label: 'Weak', color: 'bg-[#dc2626]', textColor: 'text-[#dc2626]', pct: 25 };
    if (score === 3) return { label: 'Fair', color: 'bg-[#d97706]', textColor: 'text-[#d97706]', pct: 50 };
    if (score === 4) return { label: 'Strong', color: 'bg-[#16a34a]', textColor: 'text-[#16a34a]', pct: 75 };
    return { label: 'Very Strong', color: 'bg-[#059669]', textColor: 'text-[#059669]', pct: 100 };
}

function normalizeSecurityTab(rawTab) {
    const value = String(rawTab || '').trim().toLowerCase();
    const available = SECURITY_TABS.map((tab) => tab.id);
    return available.includes(value) ? value : 'overview';
}

function isReauthCancelled(error) {
    return error?.message === 'Re-authentication cancelled';
}

function Modal({ title, icon: Icon, children, onClose }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[4px] p-0 sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                className="relative mx-4 max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.15)] sm:mx-0 sm:max-w-[520px] sm:rounded-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="px-6 pt-5 pb-4 border-b border-[#f1f5f9] flex items-center justify-between">
                    <div className="flex items-center">
                        {Icon ? <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon size={18} /></div> : null}
                        <h3 className="ml-3 text-base font-bold text-[#0f172a]">{title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#94a3b8] hover:text-[#374151] text-[20px] leading-none bg-transparent border-0 p-0"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="px-6 pt-5 pb-6">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, error, children, className = '' }) {
    return (
        <div className={className}>
            <label className="text-xs font-semibold text-[#3a4560] uppercase tracking-wide mb-1.5 block">{label}</label>
            {children}
            {error ? <p className="text-xs text-[#dc2626] mt-1">{error}</p> : null}
        </div>
    );
}

function CardShell({ children, className = '' }) {
    return <div className={classNames('bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm', className)}>{children}</div>;
}

function CardHeader({ icon, title, right = null }) {
    return (
        <div className="flex items-center gap-3 border-b border-[#f0f2f8] px-5 py-4 md:px-7 md:py-5">
            <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                {icon ? createElement(icon, { size: 16 }) : null}
            </div>
            <h3 className="text-[15px] font-semibold text-[#0f1623]">{title}</h3>
            <div className="ml-auto">{right}</div>
        </div>
    );
}

function PasswordField({ label, value, onChange, visible, onToggle, error }) {
    return (
        <Field label={label} error={error}>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]"
                >
                    {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </Field>
    );
}

function SummaryCard({ icon, title, value, valueClassName, sublabel, buttonLabel, onClick }) {
    const Icon = icon;

    return (
        <button
            type="button"
            onClick={onClick}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-left w-full"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                        <Icon size={18} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className={classNames('text-lg font-semibold mt-2', valueClassName)}>{value}</p>
                    <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
                </div>

                <span className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    {buttonLabel}
                </span>
            </div>
        </button>
    );
}

function PasswordChangeForm({
    passwordData,
    setPasswordData,
    passwordVisibility,
    setPasswordVisibility,
    passwordErrors,
    passwordStrength,
    changePasswordMutation,
    onSuccess,
}) {
    return (
        <div className="space-y-4">
            <PasswordField
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(value) => setPasswordData((prev) => ({ ...prev, currentPassword: value }))}
                visible={passwordVisibility.currentPassword}
                onToggle={() => setPasswordVisibility((prev) => ({ ...prev, currentPassword: !prev.currentPassword }))}
                error={passwordErrors.currentPassword}
            />

            <div>
                <PasswordField
                    label="New Password"
                    value={passwordData.newPassword}
                    onChange={(value) => setPasswordData((prev) => ({ ...prev, newPassword: value }))}
                    visible={passwordVisibility.newPassword}
                    onToggle={() => setPasswordVisibility((prev) => ({ ...prev, newPassword: !prev.newPassword }))}
                    error={passwordErrors.newPassword}
                />

                <div className="mt-2 flex items-center gap-2">
                    <div className="w-full h-1.5 bg-[#f0f2f8] rounded-full overflow-hidden">
                        <div className={classNames('h-full transition-all', passwordStrength.color)} style={{ width: `${passwordStrength.pct}%` }} />
                    </div>
                    <span className={classNames('text-xs font-medium', passwordStrength.textColor)}>{passwordStrength.label}</span>
                </div>
            </div>

            <PasswordField
                label="Confirm Password"
                value={passwordData.confirmPassword}
                onChange={(value) => setPasswordData((prev) => ({ ...prev, confirmPassword: value }))}
                visible={passwordVisibility.confirmPassword}
                onToggle={() => setPasswordVisibility((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                error={passwordErrors.confirmPassword}
            />

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => changePasswordMutation.mutate(passwordData, { onSuccess: () => onSuccess?.() })}
                    className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                    disabled={changePasswordMutation.isPending}
                >
                    Update Password
                </button>
            </div>
        </div>
    );
}

function MFAManageForm({
    effectiveUser,
    mfaSetupMutation,
    regenCodesMutation,
    disableMfaMutation,
    onSuccess,
}) {
    if (!effectiveUser?.mfaEnabled) {
        return (
            <div className="bg-[#dc2626]/5 border border-[#dc2626]/15 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={16} className="text-[#dc2626] mt-0.5" />
                <div className="flex-1">
                    <p className="text-[13px] text-[#7a1b1b]">Your account is not protected by two-factor authentication.</p>
                </div>
                <button
                    type="button"
                    onClick={() => mfaSetupMutation.mutate(undefined, { onSuccess: () => onSuccess?.() })}
                    className="px-3 py-1.5 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]"
                >
                    Enable MFA
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-[#16a34a]/5 border border-[#16a34a]/15 rounded-xl px-4 py-3">
                <p className="text-[13px] text-[#1f5e34]">Configured with Authenticator App</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={() => regenCodesMutation.mutate(undefined, { onSuccess: () => onSuccess?.() })}
                    className="px-3 py-2 text-sm border border-[#d0d7e8] rounded-lg text-[#3a4560] hover:bg-[#f4f6fb]"
                    disabled={regenCodesMutation.isPending}
                >
                    Regenerate Backup Codes
                </button>
                <button
                    type="button"
                    onClick={() => disableMfaMutation.mutate(undefined, { onSuccess: () => onSuccess?.() })}
                    className="px-3 py-2 text-sm border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50"
                    disabled={disableMfaMutation.isPending}
                >
                    Disable MFA
                </button>
            </div>
        </div>
    );
}

function ModalConnectedAppsRowIcon({ app }) {
    if (app.type === 'api_token') {
        return <Lock size={15} className="text-[#64748b]" />;
    }

    return <AppWindow size={15} className="text-[#64748b]" />;
}

function ConnectedAppsPanel({ apps = [], onClose, onRevoke, isRevoking = false }) {
    const appCount = apps.length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[4px] p-0 sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                className="mx-4 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_25px_50px_rgba(0,0,0,0.15)] sm:mx-0 sm:max-w-[560px] sm:rounded-[20px]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="px-6 pt-6 pb-5 border-b border-[#f1f5f9] flex items-start justify-between shrink-0">
                    <div className="flex items-start">
                        <div className="w-10 h-10 rounded-[10px] bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center">
                            <AppWindow size={18} />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-[17px] font-bold text-[#0f172a]">Connected Apps</h3>
                            <p className="mt-0.5 text-[13px] text-[#64748b]">Apps and API tokens with access to your account</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#374151] text-base flex items-center justify-center"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-5 overflow-y-auto flex-1">
                    {apps.length === 0 ? (
                        <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center">
                            <div className="rounded-full bg-[#f8fafc] p-4 text-[#cbd5e1]">
                                <AppWindow size={32} />
                            </div>
                            <p className="mt-3 text-[15px] font-semibold text-[#374151]">No connected apps</p>
                            <p className="mt-1 text-[13px] text-[#94a3b8] max-w-[250px]">
                                Apps and API tokens you authorize will appear here
                            </p>
                        </div>
                    ) : (
                        <div>
                            {apps.map((app) => {
                                const scopeText = (app.scopes || []).length ? app.scopes.join(', ') : 'No scopes';

                                return (
                                    <div key={app.id} className="py-[14px] border-b border-[#f8fafc] last:border-0 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-[9px] bg-[#f1f5f9] flex items-center justify-center shrink-0">
                                            <ModalConnectedAppsRowIcon app={app} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-[#0f172a] truncate">{app.name || 'Unnamed App'}</p>
                                            <p className="mt-0.5 text-[11px] text-[#94a3b8] truncate">
                                                {app.type === 'oauth' ? 'OAuth' : 'API Token'} · {scopeText}
                                            </p>
                                            <p className="text-[11px] text-[#94a3b8]">Last used {app.lastUsedAt ? formatRelative(app.lastUsedAt) : 'Never'}</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onRevoke?.(app.id)}
                                            disabled={isRevoking}
                                            className="text-[11px] font-semibold text-[#ef4444] bg-[#fef2f2] border border-[#fecaca] rounded-[7px] px-3 py-[5px] hover:bg-[#fee2e2] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            Revoke
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-[#f1f5f9] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12px] text-[#94a3b8]">{appCount} apps connected</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-[9px] bg-[#f8fafc] border border-[#e2e8f0] text-[13px] font-medium text-[#374151] hover:bg-[#f1f5f9]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ title }) {
    return (
        <h2 className="text-base font-bold text-[#0f172a] mb-4 pb-3 border-b border-[#f1f5f9]">
            {title}
        </h2>
    );
}

export default function SecurityPage() {
    const { user } = useAuth();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { withReauth, reauthModal, handleReauthSuccess, handleReauthClose } = useReauth();
    const requestedTab = searchParams.get('tab') || location.state?.activeTab || 'overview';

    const [activeTab, setActiveTab] = useState(() => normalizeSecurityTab(requestedTab));
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordVisibility, setPasswordVisibility] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });
    const [showMfaModal, setShowMfaModal] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [mfaStep, setMfaStep] = useState(1);
    const [mfaSetup, setMfaSetup] = useState(null);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [revealedBackupCodes, setRevealedBackupCodes] = useState([]);

    useEffect(() => {
        setActiveTab(normalizeSecurityTab(requestedTab));
    }, [requestedTab]);

    const { data: profileData } = useQuery({
        queryKey: ['settings-profile'],
        queryFn: () => settingsAPI.getProfile().then((res) => res.data?.data),
    });

    const { data: sessionsData = [] } = useQuery({
        queryKey: ['settings-sessions'],
        queryFn: () => settingsAPI.getSessions().then((res) => res.data?.data || []),
    });

    const { data: apiKeysData = [] } = useQuery({
        queryKey: ['settings-api-keys'],
        queryFn: () => settingsAPI.getApiKeys().then((res) => res.data?.data || []),
    });

    const { data: connectedAppsResponse } = useQuery({
        queryKey: ['settings-connected-apps'],
        queryFn: () => connectedAppsAPI.getAll().then((res) => res.data),
    });

    const { data: trustedDevicesData = [] } = useQuery({
        queryKey: ['settings-trusted-devices'],
        queryFn: () => settingsAPI.getTrustedDevices().then((res) => res.data?.data || []),
    });

    const effectiveUser = {
        ...user,
        ...(profileData || {}),
    };

    const connectedApps = connectedAppsResponse?.data || [];

    const changePasswordMutation = useMutation({
        mutationFn: (payload) => settingsAPI.changePassword(payload),
        onSuccess: async () => {
            toast.success('Password updated');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (error) => {
            const details = error.response?.data?.error?.details || [];
            const mapped = {};
            details.forEach((item) => {
                if (item.field) mapped[item.field] = item.message;
            });
            setPasswordErrors(mapped);
            if (!details.length) {
                toast.error(error.response?.data?.error?.message || 'Failed to update password');
            }
        },
    });

    const mfaSetupMutation = useMutation({
        mutationFn: () => settingsAPI.getMfaSetup(),
        onSuccess: (response) => {
            setMfaSetup(response.data?.data);
            setShowMfaModal(true);
            setMfaStep(1);
            setOtpDigits(['', '', '', '', '', '']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to initialize MFA setup');
        },
    });

    const verifyMfaMutation = useMutation({
        mutationFn: ({ token, secret, stateToken }) => settingsAPI.verifyMfa({ token, secret, stateToken }),
        onSuccess: async (response) => {
            setRevealedBackupCodes(response.data?.data?.backupCodes || []);
            setMfaStep(3);
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Invalid verification code');
        },
    });

    const disableMfaMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.disableMfa(credentials),
            'disabling two-factor authentication'
        ),
        onSuccess: async () => {
            toast.success('MFA disabled');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (error) => {
            if (isReauthCancelled(error)) return;
            toast.error(error.response?.data?.error?.message || 'Failed to disable MFA');
        },
    });

    const regenCodesMutation = useMutation({
        mutationFn: () => withReauth(
            (credentials) => settingsAPI.regenerateBackupCodes(credentials),
            'regenerating backup codes'
        ),
        onSuccess: async (response) => {
            setRevealedBackupCodes(response.data?.data?.backupCodes || []);
            setShowMfaModal(true);
            setMfaStep(3);
            toast.success('Backup codes regenerated');
            await queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
        },
        onError: (error) => {
            if (isReauthCancelled(error)) return;
            toast.error(error.response?.data?.error?.message || 'Failed to regenerate backup codes');
        },
    });

    const revokeDeviceMutation = useMutation({
        mutationFn: (deviceId) => settingsAPI.revokeTrustedDevice(deviceId),
        onSuccess: async () => {
            toast.success('Trusted device revoked');
            await queryClient.invalidateQueries({ queryKey: ['settings-trusted-devices'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to revoke device');
        },
    });

    const revokeAllDevicesMutation = useMutation({
        mutationFn: () => settingsAPI.revokeAllTrustedDevices(),
        onSuccess: async () => {
            toast.success('All trusted devices revoked');
            await queryClient.invalidateQueries({ queryKey: ['settings-trusted-devices'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || 'Failed to revoke all devices');
        },
    });

    const revokeConnectedAppMutation = useMutation({
        mutationFn: (appId) => connectedAppsAPI.revoke(appId),
        onSuccess: async () => {
            toast.success('Access revoked');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['settings-connected-apps'] }),
                queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] }),
            ]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to revoke access');
        },
    });

    const passwordStrength = getPasswordStrength(passwordData.newPassword || '');
    const otpValue = otpDigits.join('');

    const passwordAgeDays = getDaysSince(effectiveUser?.passwordChangedAt);
    const passwordUpToDate = !effectiveUser?.passwordChangedAt
        ? effectiveUser?.hasPassword === false
        : passwordAgeDays <= 90;

    const writeAccessCount = useMemo(() => {
        return connectedApps.filter((app) =>
            (app.scopes || []).some((scope) => String(scope).toLowerCase().startsWith('write:'))
        ).length;
    }, [connectedApps]);

    const downloadBackupCodes = () => {
        if (!revealedBackupCodes.length) return;
        const blob = new Blob([revealedBackupCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `iam-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const modalConfig = {
        password: { title: 'Update Password', icon: Lock },
        mfa: { title: 'Two-Factor Authentication', icon: ShieldCheck },
    };

    const selectedModal = activeModal ? modalConfig[activeModal] : null;
    const getSectionWrapperClass = (tabId) => classNames(
        'mb-8',
        activeTab === tabId ? 'rounded-2xl ring-1 ring-[#c7d2fe] p-2 -m-2' : ''
    );

    return (
        <div className="w-full p-0">
            <div className="animate-fade-in w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Security</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage your account security, authentication, and access controls.
                        </p>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SummaryCard
                        icon={Lock}
                        title="Password"
                        value={passwordUpToDate ? 'Up to date' : 'Needs update'}
                        valueClassName={passwordUpToDate ? 'text-emerald-600' : 'text-red-600'}
                        sublabel={formatPasswordAge(effectiveUser?.passwordChangedAt, effectiveUser?.hasPassword)}
                        buttonLabel="Update"
                        onClick={() => setActiveModal('password')}
                    />
                    <SummaryCard
                        icon={ShieldCheck}
                        title="Two-Factor Auth"
                        value={effectiveUser?.mfaEnabled ? 'Enabled' : 'Disabled'}
                        valueClassName={effectiveUser?.mfaEnabled ? 'text-emerald-600' : 'text-red-600'}
                        sublabel={effectiveUser?.mfaEnabled ? 'Authenticator app' : 'Not configured'}
                        buttonLabel="Manage"
                        onClick={() => setActiveModal('mfa')}
                    />
                    <SummaryCard
                        icon={AppWindow}
                        title="Connected Apps"
                        value={`${connectedApps.length} apps connected`}
                        valueClassName="text-slate-900"
                        sublabel={`${writeAccessCount} with write access`}
                        buttonLabel="Review"
                        onClick={() => setActiveModal('apps')}
                    />
                </div>

                <section className={getSectionWrapperClass('overview')}>
                    <SectionHeader title="Security Score" />
                    <SecurityScore
                        user={effectiveUser}
                        sessions={sessionsData}
                        apiKeys={apiKeysData}
                        connectedApps={connectedApps}
                    />
                </section>

                <section className={getSectionWrapperClass('password')}>
                    <SectionHeader title="Password" />
                    <CardShell>
                        <CardHeader
                            icon={Lock}
                            title="Password"
                            right={<span className="text-xs text-[#7a87a8]">{formatPasswordAge(effectiveUser?.passwordChangedAt, effectiveUser?.hasPassword)}</span>}
                        />
                        <div className="px-5 py-5 md:px-7 md:py-7">
                            <PasswordChangeForm
                                passwordData={passwordData}
                                setPasswordData={setPasswordData}
                                passwordVisibility={passwordVisibility}
                                setPasswordVisibility={setPasswordVisibility}
                                passwordErrors={passwordErrors}
                                passwordStrength={passwordStrength}
                                changePasswordMutation={changePasswordMutation}
                            />
                        </div>
                    </CardShell>
                </section>

                <section className={getSectionWrapperClass('mfa')}>
                    <SectionHeader title="Two-Factor Authentication" />
                    <CardShell>
                        <CardHeader
                            icon={ShieldCheck}
                            title="Two-Factor Authentication"
                            right={(
                                <span className={classNames(
                                    'text-xs font-semibold px-2 py-1 rounded-full',
                                    effectiveUser?.mfaEnabled ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-[#dc2626]/10 text-[#dc2626]'
                                )}
                                >
                                    {effectiveUser?.mfaEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            )}
                        />

                        <div className="px-5 py-5 md:px-7 md:py-7">
                            <MFAManageForm
                                effectiveUser={effectiveUser}
                                mfaSetupMutation={mfaSetupMutation}
                                regenCodesMutation={regenCodesMutation}
                                disableMfaMutation={disableMfaMutation}
                            />
                        </div>
                    </CardShell>
                </section>

                <section className={getSectionWrapperClass('devices')}>
                    <SectionHeader title="Trusted Devices" />
                    <CardShell>
                        <CardHeader icon={Monitor} title="Trusted Devices" />
                        <div>
                            {trustedDevicesData.map((device) => (
                                <div key={device.id} className="flex flex-col gap-3 border-b border-[#f0f2f8] px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between md:px-7">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#f4f6fb] rounded-lg p-1.5">
                                            {String(device.device || '').toLowerCase().includes('mobile') ? <Smartphone size={14} className="text-[#7a87a8]" /> : <Monitor size={14} className="text-[#7a87a8]" />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-[#0f1623]">{device.name || 'Unknown Device'}</p>
                                            <p className="text-xs text-[#7a87a8]">Last seen: {formatRelative(device.lastSeenAt)}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => revokeDeviceMutation.mutate(device.id)}
                                        className="text-xs text-[#dc2626] hover:underline"
                                    >
                                        Revoke
                                    </button>
                                </div>
                            ))}
                            {trustedDevicesData.length === 0 ? (
                                <div className="px-5 py-4 text-sm text-[#7a87a8] md:px-7">No trusted devices found.</div>
                            ) : null}
                        </div>
                        <div className="px-5 py-3 border-t border-[#f0f2f8] md:px-7">
                            <button
                                type="button"
                                onClick={() => revokeAllDevicesMutation.mutate()}
                                className="px-3 py-1.5 text-xs border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50"
                            >
                                Revoke All Devices
                            </button>
                        </div>
                    </CardShell>
                </section>

                <section className={getSectionWrapperClass('connected-apps')}>
                    <SectionHeader title="Connected Apps" />
                    <ConnectedApps />
                </section>
            </div>

            {activeModal === 'apps' ? (
                <ConnectedAppsPanel
                    apps={connectedApps}
                    onClose={() => setActiveModal(null)}
                    onRevoke={(appId) => revokeConnectedAppMutation.mutate(appId)}
                    isRevoking={revokeConnectedAppMutation.isPending}
                />
            ) : null}

            {selectedModal ? (
                <Modal
                    title={selectedModal.title}
                    icon={selectedModal.icon}
                    onClose={() => setActiveModal(null)}
                >
                    {activeModal === 'password' ? (
                        <PasswordChangeForm
                            passwordData={passwordData}
                            setPasswordData={setPasswordData}
                            passwordVisibility={passwordVisibility}
                            setPasswordVisibility={setPasswordVisibility}
                            passwordErrors={passwordErrors}
                            passwordStrength={passwordStrength}
                            changePasswordMutation={changePasswordMutation}
                            onSuccess={() => setActiveModal(null)}
                        />
                    ) : null}

                    {activeModal === 'mfa' ? (
                        <MFAManageForm
                            effectiveUser={effectiveUser}
                            mfaSetupMutation={mfaSetupMutation}
                            regenCodesMutation={regenCodesMutation}
                            disableMfaMutation={disableMfaMutation}
                            onSuccess={() => setActiveModal(null)}
                        />
                    ) : null}
                </Modal>
            ) : null}

            {showMfaModal ? (
                <Modal
                    title="MFA Setup"
                    icon={ShieldCheck}
                    onClose={() => {
                        setShowMfaModal(false);
                        setMfaStep(1);
                    }}
                >
                    {mfaStep === 1 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password).
                            </p>
                            <div className="flex justify-center">
                                <img src={mfaSetup?.qrCodeUrl} alt="MFA QR" className="w-[180px] h-[180px] border border-[#d0d7e8] rounded-xl" />
                            </div>
                            <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl p-3">
                                <p className="text-xs text-[#7a87a8] mb-1">Manual Secret</p>
                                <p className="font-mono text-sm break-all text-[#0f1623]">{mfaSetup?.secret}</p>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setMfaStep(2)}
                                    className="px-4 py-2 text-sm bg-[#4f46e5] text-white rounded-lg"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {mfaStep === 2 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">Enter the 6-digit code from your app</p>
                            <div className="flex gap-2 justify-center">
                                {otpDigits.map((digit, index) => (
                                    <input
                                        key={index}
                                        value={digit}
                                        onChange={(event) => {
                                            const clean = event.target.value.replace(/\D/g, '').slice(-1);
                                            setOtpDigits((prev) => {
                                                const next = [...prev];
                                                next[index] = clean;
                                                return next;
                                            });
                                            if (clean && index < 5) {
                                                const nextInput = document.getElementById(`security-otp-${index + 1}`);
                                                nextInput?.focus();
                                            }
                                        }}
                                        id={`security-otp-${index}`}
                                        maxLength={1}
                                        className="w-10 h-12 text-center text-lg font-mono border border-[#d0d7e8] rounded-xl focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25"
                                    />
                                ))}
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => verifyMfaMutation.mutate({
                                        token: otpValue,
                                        secret: mfaSetup?.secret,
                                        stateToken: mfaSetup?.stateToken,
                                    })}
                                    className="px-4 py-2 text-sm bg-[#4f46e5] text-white rounded-lg"
                                    disabled={otpValue.length !== 6 || verifyMfaMutation.isPending}
                                >
                                    Verify & Enable
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {mfaStep === 3 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[#3a4560]">Save these codes somewhere safe. Each can only be used once.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {revealedBackupCodes.map((code) => (
                                    <div key={code} className="font-mono text-sm bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg px-4 py-2 text-center">
                                        {code}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={downloadBackupCodes}
                                    className="px-3 py-2 text-sm border border-[#d0d7e8] rounded-lg"
                                >
                                    Download Codes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowMfaModal(false)}
                                    className="px-3 py-2 text-sm bg-[#4f46e5] text-white rounded-lg"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : null}
                </Modal>
            ) : null}

            <ReauthModal
                isOpen={reauthModal.isOpen}
                onClose={handleReauthClose}
                onSuccess={handleReauthSuccess}
                action={reauthModal.action}
                requiresMfa={reauthModal.requiresMfa}
                actionLabel={reauthModal.actionLabel}
            />
        </div>
    );
}
