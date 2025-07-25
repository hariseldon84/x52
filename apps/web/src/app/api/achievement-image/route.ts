import { NextRequest, NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';

// This API route generates dynamic achievement images for social sharing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const title = searchParams.get('title') || 'Achievement Unlocked';
    const category = searchParams.get('category') || 'productivity';
    const rarity = searchParams.get('rarity') || 'common';
    const xp = searchParams.get('xp') || '0';
    const icon = searchParams.get('icon') || 'trophy';

    // Create canvas
    const width = 1200;
    const height = 630; // Standard social media image size
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Define colors based on rarity
    const rarityColors = {
      common: { bg: '#f3f4f6', accent: '#6b7280', gradient: ['#f9fafb', '#f3f4f6'] },
      rare: { bg: '#dbeafe', accent: '#3b82f6', gradient: ['#eff6ff', '#dbeafe'] },
      epic: { bg: '#e9d5ff', accent: '#8b5cf6', gradient: ['#f5f3ff', '#e9d5ff'] },
      legendary: { bg: '#fef3c7', accent: '#f59e0b', gradient: ['#fffbeb', '#fef3c7'] }
    };

    const colors = rarityColors[rarity as keyof typeof rarityColors] || rarityColors.common;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.gradient[0]);
    gradient.addColorStop(1, colors.gradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add brand section
    ctx.fillStyle = '#1f2937'; // Dark gray
    ctx.fillRect(0, 0, width, 80);
    
    // TaskQuest logo/brand
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('TaskQuest', 40, 50);

    // Achievement badge background
    const badgeSize = 120;
    const badgeX = width - 200;
    const badgeY = 120;
    
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Achievement icon (simplified - in reality you'd load actual icons)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', badgeX, badgeY + 15);

    // Achievement title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Word wrap for title
    const maxWidth = width - 280;
    const words = title.split(' ');
    let line = '';
    let y = 150;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, 40, y);
        line = words[n] + ' ';
        y += 60;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 40, y);

    // Category and rarity badges
    y += 80;
    ctx.font = 'bold 24px Arial';
    
    // Category badge
    const categoryText = category.charAt(0).toUpperCase() + category.slice(1);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(40, y, 150, 40);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(categoryText, 115, y + 28);

    // Rarity badge
    const rarityText = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(210, y, 120, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(rarityText, 270, y + 28);

    // XP earned
    y += 80;
    ctx.fillStyle = colors.accent;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`+${xp} XP Earned`, 40, y);

    // Achievement unlocked text
    y += 80;
    ctx.fillStyle = '#059669'; // Green
    ctx.font = 'bold 28px Arial';
    ctx.fillText('🎉 Achievement Unlocked!', 40, y);

    // Call to action
    y += 50;
    ctx.fillStyle = '#6b7280';
    ctx.font = '24px Arial';
    ctx.fillText('Join me in building better productivity habits with TaskQuest!', 40, y);

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Return image response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error generating achievement image:', error);
    
    // Return a simple error image
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 1200, 630);
    
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Achievement Image', 600, 315);
    
    const buffer = canvas.toBuffer('image/png');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
}