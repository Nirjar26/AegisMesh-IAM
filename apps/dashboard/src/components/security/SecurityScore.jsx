import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateSecurityScore } from '../../utils/securityScore';

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

const RATING_STYLES = {
    Excellent: {
        header: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        accent: 'text-emerald-600',
    },
    Good: {
        header: 'bg-gradient-to-r from-green-500 to-green-600',
        accent: 'text-green-600',
    },
    Fair: {
        header: 'bg-gradient-to-r from-amber-500 to-amber-600',
        accent: 'text-amber-600',
    },
    'At Risk': {
        header: 'bg-gradient-to-r from-red-500 to-red-600',
        accent: 'text-red-600',
    },
};

function getScoreColor(score) {
    if (score <= 39) {
        return {
            stroke: 'var(--ds-color-danger)',
            text: 'var(--ds-color-danger)',
            label: 'Critical Risk',
            bg: 'var(--ds-color-bg-0)',
        };
    }

    if (score <= 59) {
        return {
            stroke: 'var(--ds-color-warning)',
            text: 'var(--ds-color-warning)',
            label: 'Needs Attention',
            bg: 'var(--ds-color-bg-0)',
        };
    }

    if (score <= 79) {
        return {
            stroke: 'var(--ds-color-info)',
            text: 'var(--ds-color-info)',
            label: 'Fair',
            bg: 'var(--ds-color-bg-1)',
        };
    }

    if (score <= 99) {
        return {
            stroke: 'var(--ds-color-success)',
            text: 'var(--ds-color-success)',
            label: 'Good',
            bg: 'var(--ds-color-bg-1)',
        };
    }

    return {
        stroke: 'var(--ds-color-accent)',
        text: 'var(--ds-color-accent)',
        label: 'Excellent',
        bg: 'var(--ds-color-bg-1)',
    };
}

function IncompleteChecklistItem({ check, onAction }) {
    return (
        <div className="mb-2 flex flex-col gap-3 rounded-[10px] border border-[var(--ds-color-bg-0)] bg-[var(--ds-color-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex items-center gap-2.5 pr-0 sm:pr-3">
                <AlertCircle size={14} className="shrink-0 text-[var(--ds-color-danger)]" />
                <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--ds-color-text-primary)] truncate">{check.label}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--ds-color-text-muted)] truncate">
                        {check.description}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={() => onAction?.(check)}
                className="shrink-0 bg-transparent border-none cursor-pointer text-[11px] font-semibold text-[var(--ds-color-accent)] inline-flex items-center gap-1"
            >
                Fix Now
                <ArrowRight size={12} />
            </button>
        </div>
    );
}

IncompleteChecklistItem.propTypes = {
    check: PropTypes.shape({
        label: PropTypes.string.isRequired,
        description: PropTypes.string,
        actionPath: PropTypes.string,
        actionTab: PropTypes.string,
    }).isRequired,
    onAction: PropTypes.func,
};

function CompletedChecklistItem({ check }) {
    return (
        <div className="flex items-center gap-2 opacity-60 text-[12px] text-[var(--ds-color-text-primary)] py-1">
            <CheckCircle size={14} className="text-[var(--ds-color-success)] shrink-0" />
            <span className="truncate">{check.label}</span>
        </div>
    );
}

export default function SecurityScore({ user, sessions, apiKeys, connectedApps, onAction }) {
    const navigate = useNavigate();
    const [animatedScore, setAnimatedScore] = useState(0);
    const [showCompleted, setShowCompleted] = useState(false);

    const result = useMemo(
        () => calculateSecurityScore(user, sessions, apiKeys, connectedApps),
        [user, sessions, apiKeys, connectedApps],
    );
    const ratingStyle = RATING_STYLES[result.rating] || RATING_STYLES.Good;
    const scoreColors = getScoreColor(result.score);
    const circumference = 2 * Math.PI * 52;
    const dashOffset = circumference - (animatedScore / 100) * circumference;
    const incompleteChecks = useMemo(
        () => result.checks.filter((check) => !check.passed),
        [result.checks],
    );
    const completedChecks = useMemo(
        () => result.checks.filter((check) => check.passed),
        [result.checks],
    );

    useEffect(() => {
        const frame = globalThis.requestAnimationFrame(() => {
            globalThis.setTimeout(() => {
                setAnimatedScore(result.score);
            }, 60);
        });

        return () => globalThis.cancelAnimationFrame(frame);
    }, [result.score]);

    const handleAction = (check) => {
        if (onAction) {
            onAction(check);
            return;
        }

        if (!check?.actionPath) {
            return;
        }

        navigate(check.actionPath, {
            state: {
                activeTab: check.actionTab,
            },
        });
    };

    return (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-3">
                <div
                    className={classNames(
                        'flex flex-col gap-6 px-5 py-5 md:px-7 md:py-7 lg:col-span-1',
                        ratingStyle.header,
                    )}
                >
                    <div>
                        <p className="text-sm font-medium text-white/80">Security Score</p>
                        <div className="flex items-end gap-2 mt-2">
                            <span className="text-6xl font-black text-white leading-none">
                                {result.score}
                            </span>
                            <span className="text-2xl text-white/60 mb-1">/100</span>
                        </div>
                        <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
                            {result.rating}
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="relative h-[120px] w-[120px]">
                                <svg
                                    width="120"
                                    height="120"
                                    viewBox="0 0 120 120"
                                    className="-rotate-90"
                                >
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="52"
                                        fill="none"
                                        stroke={scoreColors.bg}
                                        strokeWidth="10"
                                    />
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="52"
                                        fill="none"
                                        stroke={scoreColors.stroke}
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashOffset}
                                        className="transition-all duration-700 ease-out"
                                    />
                                </svg>
                                <svg
                                    width="120"
                                    height="120"
                                    viewBox="0 0 120 120"
                                    className="absolute inset-0"
                                >
                                    <text
                                        x="60"
                                        y="60"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill={scoreColors.text}
                                    >
                                        <tspan fontSize="28" fontWeight="700">
                                            {result.score}
                                        </tspan>
                                        <tspan x="60" dy="18" fontSize="11" fill="var(--ds-color-text-muted)">
                                            / 100
                                        </tspan>
                                    </text>
                                </svg>
                            </div>
                            <p
                                className="mt-1 text-center text-[12px] font-semibold"
                                style={{ color: scoreColors.text }}
                            >
                                {scoreColors.label}
                            </p>
                            <p className="mt-2 text-center text-[12px] text-[var(--ds-color-text-muted)]">
                                {result.passed.length} of {result.checks.length} checks passed
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white px-5 py-5 md:px-7 md:py-7 lg:col-span-2">
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <h4 className="text-base font-semibold text-slate-900">
                            Security Checklist
                        </h4>
                        {incompleteChecks.length > 0 ? (
                            <span className="text-sm text-red-500">
                                {incompleteChecks.length} issues need attention
                            </span>
                        ) : (
                            <span className="text-sm text-emerald-500">All checks passed</span>
                        )}
                    </div>

                    <div>
                        {incompleteChecks.length > 0 ? (
                            incompleteChecks.map((check) => (
                                <IncompleteChecklistItem
                                    key={check.id}
                                    check={check}
                                    onAction={handleAction}
                                />
                            ))
                        ) : (
                            <div className="rounded-[10px] border border-[var(--ds-color-bg-0)] bg-[var(--ds-color-bg-0)] px-4 py-3 text-[13px] text-[var(--ds-color-text-primary)]">
                                No incomplete checks.
                            </div>
                        )}
                    </div>

                    <div className="mt-2">
                        <button
                            type="button"
                            onClick={() => setShowCompleted((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ds-color-text-muted)] hover:text-[var(--ds-color-text-primary)]"
                        >
                            See completed ({completedChecks.length})
                            {showCompleted ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>

                        {showCompleted ? (
                            <div className="mt-2 rounded-[10px] border border-[var(--ds-color-border)] bg-[var(--ds-color-bg-0)] px-4 py-2">
                                {completedChecks.map((check) => (
                                    <CompletedChecklistItem key={check.id} check={check} />
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

CompletedChecklistItem.propTypes = {
    check: PropTypes.shape({
        label: PropTypes.string.isRequired,
    }).isRequired,
};

SecurityScore.propTypes = {
    user: PropTypes.object,
    sessions: PropTypes.array,
    apiKeys: PropTypes.array,
    connectedApps: PropTypes.array,
    onAction: PropTypes.func,
};
