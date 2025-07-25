// Epic 8, Story 8.1: Outlook Calendar OAuth Callback

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { calendarService } from '@/lib/services/calendarService';

export default function OutlookCalendarCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(`Authorization failed: ${errorDescription || error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        // Exchange code for tokens and create connection
        await calendarService.connectOutlookCalendar(code);
        
        setStatus('success');
        setMessage('Outlook Calendar connected successfully!');
        
        // Redirect to integrations page after 2 seconds
        setTimeout(() => {
          router.push('/integrations/calendar');
        }, 2000);
        
      } catch (error) {
        console.error('Outlook Calendar connection error:', error);
        setStatus('error');
        setMessage(
          error instanceof Error 
            ? error.message 
            : 'Failed to connect Outlook Calendar'
        );
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className=\"container mx-auto py-16 px-4\">
      <div className=\"max-w-md mx-auto\">
        <Card>
          <CardHeader className=\"text-center\">
            <div className=\"flex justify-center mb-4\">
              {status === 'loading' && (
                <Loader2 className=\"h-12 w-12 animate-spin text-blue-500\" />
              )}
              {status === 'success' && (
                <CheckCircle className=\"h-12 w-12 text-green-500\" />
              )}
              {status === 'error' && (
                <XCircle className=\"h-12 w-12 text-red-500\" />
              )}
            </div>
            
            <CardTitle>
              {status === 'loading' && 'Connecting Outlook Calendar...'}
              {status === 'success' && 'Connection Successful!'}
              {status === 'error' && 'Connection Failed'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className=\"text-center space-y-4\">
            <p className=\"text-gray-600 dark:text-gray-400\">
              {message || 'Processing your Outlook Calendar connection...'}
            </p>
            
            {status === 'success' && (
              <p className=\"text-sm text-gray-500\">
                Redirecting you to the integrations page...
              </p>
            )}
            
            {status === 'error' && (
              <Button
                onClick={() => router.push('/integrations/calendar')}
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