// Epic 8, Story 8.2: Slack Interactive Components API Route

import { NextRequest, NextResponse } from 'next/server';
import { slackService } from '@/lib/services/slackService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = JSON.parse(new URLSearchParams(body).get('payload') || '{}');
    
    // Verify the request is from Slack
    if (payload.token !== process.env.SLACK_VERIFICATION_TOKEN) {
      return NextResponse.json(
        { error: 'Invalid token' }, 
        { status: 401 }
      );
    }
    
    switch (payload.type) {
      case 'block_actions':
        return await handleBlockActions(payload);
        
      case 'view_submission':
        return await handleViewSubmission(payload);
        
      case 'shortcut':
        return await handleShortcut(payload);
        
      default:
        console.log('Unhandled interaction type:', payload.type);
        return NextResponse.json({ ok: true });
    }
    
  } catch (error) {
    console.error('Slack interactive error:', error);
    return NextResponse.json({ 
      text: 'Sorry, there was an error processing your request.' 
    });
  }
}

async function handleBlockActions(payload: any) {
  const action = payload.actions[0];
  
  switch (action.action_id) {
    case 'create_task_from_message':
      // Handle task creation from message action
      try {
        const taskId = await slackService.createTaskFromMessage(
          payload.team.id,
          payload.channel.id,
          payload.message.ts,
          payload.message.text,
          payload.user.id,
          'message_action'
        );
        
        return NextResponse.json({
          text: `✅ Task created successfully!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Task created from message by <@${payload.user.id}>`,
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Task',
                },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}`,
              },
            },
          ],
        });
      } catch (error) {
        return NextResponse.json({
          text: 'Failed to create task. Please try again.',
        });
      }
      
    case 'assign_task':
      // Handle task assignment
      const selectedUser = action.selected_user;
      return NextResponse.json({
        text: `Task assigned to <@${selectedUser}>`,
      });
      
    case 'complete_task':
      // Handle task completion
      return NextResponse.json({
        text: '✅ Task marked as complete!',
      });
      
    default:
      return NextResponse.json({ ok: true });
  }
}

async function handleViewSubmission(payload: any) {
  const viewId = payload.view.callback_id;
  
  switch (viewId) {
    case 'task_creation_modal':
      // Handle task creation modal submission
      const values = payload.view.state.values;
      const title = values.task_title.title_input.value;
      const description = values.task_description?.description_input?.value;
      const priority = values.task_priority?.priority_select?.selected_option?.value || 'medium';
      
      try {
        const taskId = await slackService.createTaskFromMessage(
          payload.team.id,
          payload.view.private_metadata, // channel_id stored in metadata
          Date.now().toString(),
          title,
          payload.user.id,
          'slash_command'
        );
        
        // Close modal and show success message
        return NextResponse.json({
          response_action: 'clear',
          text: `✅ Task "${title}" created successfully!`,
        });
      } catch (error) {
        return NextResponse.json({
          response_action: 'errors',
          errors: {
            task_title: 'Failed to create task. Please try again.',
          },
        });
      }
      
    default:
      return NextResponse.json({ ok: true });
  }
}

async function handleShortcut(payload: any) {
  const shortcutId = payload.callback_id;
  
  switch (shortcutId) {
    case 'create_task_shortcut':
      // Open task creation modal
      const modal = {
        type: 'modal',
        callback_id: 'task_creation_modal',
        private_metadata: payload.channel?.id || '',
        title: {
          type: 'plain_text',
          text: 'Create Task',
        },
        submit: {
          type: 'plain_text',
          text: 'Create',
        },
        close: {
          type: 'plain_text',
          text: 'Cancel',
        },
        blocks: [
          {
            type: 'input',
            block_id: 'task_title',
            element: {
              type: 'plain_text_input',
              action_id: 'title_input',
              placeholder: {
                type: 'plain_text',
                text: 'Enter task title...',
              },
            },
            label: {
              type: 'plain_text',
              text: 'Task Title',
            },
          },
          {
            type: 'input',
            block_id: 'task_description',
            optional: true,
            element: {
              type: 'plain_text_input',
              action_id: 'description_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Enter task description...',
              },
            },
            label: {
              type: 'plain_text',
              text: 'Description',
            },
          },
          {
            type: 'input',
            block_id: 'task_priority',
            optional: true,
            element: {
              type: 'static_select',
              action_id: 'priority_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select priority',
              },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: 'Low',
                  },
                  value: 'low',
                },
                {
                  text: {
                    type: 'plain_text',
                    text: 'Medium',
                  },
                  value: 'medium',
                },
                {
                  text: {
                    type: 'plain_text',
                    text: 'High',
                  },
                  value: 'high',
                },
                {
                  text: {
                    type: 'plain_text',
                    text: 'Urgent',
                  },
                  value: 'urgent',
                },
              ],
            },
            label: {
              type: 'plain_text',
              text: 'Priority',
            },
          },
        ],
      };
      
      // Return modal view
      return NextResponse.json({
        type: 'modal',
        view: modal,
      });
      
    default:
      return NextResponse.json({ ok: true });
  }
}