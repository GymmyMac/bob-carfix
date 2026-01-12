import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, ShieldAlert, ExternalLink, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLoginForm } from './AdminLoginForm';
import { getStorageType } from '@/lib/backend/safeStorage';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { 
    user, 
    isAdmin, 
    adminStatus,
    isAdminStatusUnknown,
    isLoading, 
    error, 
    signOut, 
    refreshAuth, 
    clearAuthAndRetry 
  } = useAdminAuth();
  const storageType = getStorageType();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
          <p className="text-xs text-muted-foreground/60">Storage: {storageType}</p>
        </div>
      </div>
    );
  }

  // Not logged in - show inline login form
  if (!user) {
    // If there was an error (like session verification failed), show recovery UI with login option
    if (error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <ShieldAlert className="h-6 w-6 text-amber-500" />
              </div>
              <CardTitle>Session Verification Issue</CardTitle>
              <CardDescription>
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground text-center">
                This can happen in embedded preview windows. Try one of these options:
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => window.location.reload()} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearAuthAndRetry}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Auth Data & Retry
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button variant="ghost" onClick={refreshAuth} className="w-full">
                  Try Login Again
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60 text-center">
                Storage: {storageType}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // No error, just not logged in - show inline login form
    return <AdminLoginForm onSuccess={refreshAuth} />;
  }

  // Logged in but admin status is unknown (timeout/error during role check)
  // Show a "Still verifying..." UI with retry options instead of Access Denied
  if (isAdminStatusUnknown) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle>Verifying Permissions</CardTitle>
            <CardDescription>
              {error || 'Still checking your admin status...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
            <p className="text-sm text-muted-foreground text-center">
              The backend may be waking up. Try one of these options:
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={refreshAuth} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Now
              </Button>
              <Button 
                variant="outline" 
                onClick={clearAuthAndRetry}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Auth Data & Retry
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button variant="ghost" onClick={signOut} className="w-full">
                Sign Out
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 text-center">
              Storage: {storageType}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in but confirmed NOT admin - show access denied
  if (adminStatus === 'not_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Contact an administrator if you believe this is an error.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
              <Button variant="ghost" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is admin - render children
  return <>{children}</>;
};
