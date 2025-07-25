// Epic 8, Story 8.2: Slack Events API Route

import { NextRequest, NextResponse } from 'next/server';
import { slackService } from '@/lib/services/slackService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }
    
    // Verify the request is from Slack (in production, verify signing secret)
    if (body.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid token' }, 
        { status: 401 }
      );
    }
    
    // Handle event callback
    if (body.type === 'event_callback') {
      const event = body.event;
      
      switch (event.type) {
        case 'reaction_added':
          // Handle emoji reactions for task creation
          await slackService.handleEmojiReaction(body);
          break;
          
        case 'message':
          // Handle direct messages to the bot
          if (event.channel_type === 'im' && !event.bot_id) {
            // Handle DM commands
            console.log('DM received:', event.text);
          }
          break;
          
        case 'app_mention':
          // Handle when bot is mentioned
          console.log('Bot mentioned:', event.text);
          break;
          
        default:
          console.log('Unhandled event type:', event.type);
      }
    }
    
    // Slack expects a 200 response within 3 seconds
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error('Slack event error:', error);
    return NextResponse.json({ ok: true }); // Still return 200 to avoid retries
  }
}

export async function GET(request: NextRequest) {
  // Handle Slack's challenge for event subscription setup
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({ error: 'No challenge provided' }, { status: 400 });
}