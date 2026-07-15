interface LoadingStateProps {
    message?: string;
}

export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
    return (
        <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-[var(--ds-color-accent)] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-[var(--ds-color-text-muted)]">{message}</p>
        </div>
    );
}
