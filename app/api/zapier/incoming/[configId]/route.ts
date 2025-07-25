// Epic 8, Story 8.6: Zapier Incoming Webhook Handler

import { NextRequest, NextResponse } from 'next/server';
import { zapierService } from '@/lib/services/zapierService';

export async function POST(
  request: NextRequest,
  { params }: { params: { configId: string } }
) {
  try {
    const configId = params.configId;
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());
    
    // Get client IP and user agent
    const forwardedFor = headers['x-forwarded-for'];
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                     headers['x-real-ip'] || 
                     request.headers.get('remote-addr') || 
                     'unknown';
    const userAgent = headers['user-agent'] || 'unknown';

    // Extract action type from payload or URL
    const actionType = body.action_type || body.type || 'unknown_action';

    // Process the incoming request
    const status = await zapierService.processIncomingRequest(
      configId,
      actionType,
      headers,
      body,
      ipAddress,
      userAgent
    );

    // Return appropriate response based on processing status
    switch (status) {
      case 'processed':
        return NextResponse.json({
          success: true,
          message: 'Request processed successfully',
          action_type: actionType,
          processed_at: new Date().toISOString(),
        });

      case 'rejected':
        return NextResponse.json(
          {
            success: false,
            error: 'Request rejected - authentication failed or invalid action',
            action_type: actionType,
          },
          { status: 401 }
        );

      case 'failed':
        return NextResponse.json(
          {
            success: false,
            error: 'Request processing failed',
            action_type: actionType,
          },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Request is being processed',
            action_type: actionType,
            status: status,
          },
          { status: 202 }
        );
    }

  } catch (error) {
    console.error('Zapier incoming webhook error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { configId: string } }
) {
  try {
    const configId = params.configId;
    
    // This endpoint can be used by Zapier to verify the webhook is working
    return NextResponse.json({
      config_id: configId,
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Zapier incoming webhook endpoint is active',
    });

  } catch (error) {
    console.error('Zapier incoming webhook info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}