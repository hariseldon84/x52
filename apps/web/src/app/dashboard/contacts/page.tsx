import { Metadata } from 'next';
import { ContactList } from '@/components/contact-list';

export const metadata: Metadata = {
  title: 'Contacts | TaskQuest',
  description: 'Manage your professional contacts and relationships',
};

export default function ContactsPage() {
  return (
    <div className="container mx-auto py-6">
      <ContactList />
    </div>
  );
}