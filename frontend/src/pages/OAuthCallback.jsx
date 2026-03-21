import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loadProfile } = useAuth();

    useEffect(() => {
        const error = searchParams.get('error');

        if (error) {
            navigate('/login?error=oauth_failed');
            return;
        }

        const finalizeOAuth = async () => {
            try {
                await loadProfile();
                navigate('/dashboard', { replace: true });
            } catch {
                navigate('/login?error=oauth_failed', { replace: true });
            }
        };

        finalizeOAuth();
    }, [loadProfile, navigate, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-aws-dark">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-3 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                <p className="text-aws-text-dim text-sm">Completing sign in...</p>
            </div>
        </div>
    );
}


