import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api.ts';
import { Button } from '../components/ui/button.tsx';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAccept = async () => {
    if (!token || !email) {
      setError('Invalid invite link: missing token or email');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/invites/accept', { token, email });
      toast.success('Invite accepted successfully');
      navigate('/workspaces');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to accept invite';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && email) {
      handleAccept();
    }
  }, [token, email]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background bg-dotted-grid">
      <div className="w-full max-w-sm">
        <div className="text-center mb-3">
          <span className="font-mono text-xs font-semibold text-muted-foreground tracking-widest uppercase">bpp_</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-none text-center space-y-4">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Workspace Invitation</h1>

          {error ? (
            <div className="space-y-4">
              <p className="font-mono text-xs text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                Return to Login
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Accepting invitation for{' '}
                <span className="font-mono text-xs font-medium text-foreground">{email}</span>...
              </p>
              <Button size="sm" disabled={loading} onClick={handleAccept}>
                {loading ? 'Joining workspace...' : 'Accept Invitation'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
