// Epic 8, Story 8.6: Zapier Webhook Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { zapierService } from '@/lib/services/zapierService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const webhookId = params.id;
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());

    // Verify webhook exists and get details
    const webhook = await zapierService.getWebhook(webhookId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    if (!webhook.is_active) {
      return NextResponse.json(
        { error: 'Webhook is inactive' },
        { status: 410 }
      );
    }

    // Verify secret token
    const providedSecret = headers['x-zapier-secret'] || headers['authorization']?.replace('Bearer ', '');
    if (providedSecret !== webhook.secret_token) {
      return NextResponse.json(
        { error: 'Invalid secret token' },
        { status: 401 }
      );
    }

    // This is a test endpoint - in production, webhooks would be sent TO Zapier
    // For testing purposes, we'll just log the received data
    console.log('Zapier webhook test received:', {
      webhookId,
      webhook: webhook.webhook_name,
      body,
    });

    return NextResponse.json({
      success: true,
      webhook_id: webhookId,
      webhook_name: webhook.webhook_name,
      message: 'Webhook test received successfully',
      received_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Zapier webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const webhookId = params.id;
    
    // Get webhook info for verification
    const webhook = await zapierService.getWebhook(webhookId);
    if (!webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      webhook_id: webhookId,
      webhook_name: webhook.webhook_name,
      is_active: webhook.is_active,
      trigger_events: webhook.trigger_events,
      status: 'ready',
    });

  } catch (error) {
    console.error('Zapier webhook info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}