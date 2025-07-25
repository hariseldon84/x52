// Epic 8, Story 8.2: Slack OAuth Callback

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, MessageSquare } from 'lucide-react';
import { slackService } from '@/lib/services/slackService';

export default function SlackCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authorization failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        // Exchange code for tokens and create connection
        const connection = await slackService.connectWorkspace(code);
        
        setStatus('success');
        setWorkspaceName(connection.workspace?.team_name || 'Slack workspace');
        setMessage(`${workspaceName} connected successfully!`);
        
        // Redirect to integrations page after 2 seconds
        setTimeout(() => {
          router.push('/integrations/slack');
        }, 2000);
        
      } catch (error) {
        console.error('Slack connection error:', error);
        setStatus('error');
        setMessage(
          error instanceof Error 
            ? error.message 
            : 'Failed to connect Slack workspace'
        );
      }
    };

    handleCallback();
  }, [searchParams, router, workspaceName]);

  return (
    <div className=\"container mx-auto py-16 px-4\">
      <div className=\"max-w-md mx-auto\">
        <Card>
          <CardHeader className=\"text-center\">
            <div className=\"flex justify-center mb-4\">
              {status === 'loading' && (
                <Loader2 className=\"h-12 w-12 animate-spin text-purple-500\" />
              )}
              {status === 'success' && (
                <CheckCircle className=\"h-12 w-12 text-green-500\" />
              )}
              {status === 'error' && (
                <XCircle className=\"h-12 w-12 text-red-500\" />
              )}
            </div>
            
            <CardTitle className=\"flex items-center justify-center gap-2\">
              <MessageSquare className=\"h-5 w-5\" />
              {status === 'loading' && 'Connecting Slack Workspace...'}
              {status === 'success' && 'Connection Successful!'}
              {status === 'error' && 'Connection Failed'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className=\"text-center space-y-4\">
            <p className=\"text-gray-600 dark:text-gray-400\">
              {message || 'Processing your Slack workspace connection...'}
            </p>
            
            {status === 'success' && (
              <>
                <div className=\"bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3\">
                  <p className=\"text-sm text-green-700 dark:text-green-300\">
                    Your workspace is now connected! You can start creating tasks using:
                  </p>
                  <div className=\"mt-2 space-y-1 text-xs text-green-600 dark:text-green-400\">
                    <p>• <code>/task [title]</code> - Create new tasks</p>
                    <p>• React with 📝 or ⚡ to convert messages</p>
                    <p>• Get daily productivity summaries</p>
                  </div>
                </div>
                <p className=\"text-sm text-gray-500\">
                  Redirecting you to the integrations page...
                </p>
              </>
            )}
            
            {status === 'error' && (
              <Button
                onClick={() => router.push('/integrations/slack')}
                className=\"w-full\"
              >
                Return to Integrations
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}