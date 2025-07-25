// Epic 8, Story 8.2: Slack Slash Commands API Route

import { NextRequest, NextResponse } from 'next/server';
import { slackService } from '@/lib/services/slackService';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from Slack
    const body = await request.text();
    const payload = new URLSearchParams(body);
    
    // Slack sends form-encoded data
    const slackPayload = {
      token: payload.get('token'),
      team_id: payload.get('team_id'),
      team_domain: payload.get('team_domain'),
      channel_id: payload.get('channel_id'),
      channel_name: payload.get('channel_name'),
      user_id: payload.get('user_id'),
      user_name: payload.get('user_name'),
      command: payload.get('command'),
      text: payload.get('text'),
      response_url: payload.get('response_url'),
      trigger_id: payload.get('trigger_id'),
    };

    // Verify token (in production, use signing secret instead)
    if (slackPayload.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid token' }, 
        { status: 401 }
      );
    }

    // Handle the slash command
    const response = await slackService.handleSlashCommand(slackPayload);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Slack command error:', error);
    
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Sorry, there was an error processing your command. Please try again.',
    });
  }
}

// Handle Slack's URL verification for Events API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ error: 'No challenge provided' }, { status: 400 });
}