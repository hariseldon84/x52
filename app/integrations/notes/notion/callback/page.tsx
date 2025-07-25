'use client';

// Epic 8, Story 8.3: Notion OAuth Callback Handler

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { notesService } from '@/lib/services/notesService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function NotionCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setError('Authorization was denied or cancelled');
        return;
      }

      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      try {
        await notesService.connectNotion(code);
        setStatus('success');
        
        // Redirect to integrations page after a brief delay
        setTimeout(() => {
          router.push('/integrations/notes');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to connect Notion');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const handleRetry = () => {
    router.push('/integrations/notes');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <RefreshCw className="h-12 w-12 animate-spin text-blue-500" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          <CardTitle>
            {status === 'loading' && 'Connecting to Notion...'}
            {status === 'success' && 'Successfully Connected!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <p className="text-muted-foreground">
              Please wait while we connect your Notion workspace to TaskQuest.
            </p>
          )}
          
          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Your Notion workspace has been successfully connected to TaskQuest.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you back to integrations...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {error}
              </p>
              <Button onClick={handleRetry} className="w-full">
                Back to Integrations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}