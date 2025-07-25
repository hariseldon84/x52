import { Metadata } from 'next';
import { AchievementGallery } from '@/components/achievement-gallery';

export const metadata: Metadata = {
  title: 'Achievements | TaskQuest',
  description: 'View your achievements and track your progress toward new milestones',
};

export default function AchievementsPage() {
  return (
    <div className="container mx-auto py-6">
      <AchievementGallery />
    </div>
  );
}