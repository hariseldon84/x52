import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContactDetail } from '@/components/contact-detail';
import { createClient } from '@/utils/supabase/server';

interface ContactPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const supabase = createClient();
  
  const { data: contact } = await supabase
    .from('contacts')
    .select('name')
    .eq('id', params.id)
    .single();

  return {
    title: contact ? `${contact.name} | TaskQuest` : 'Contact | TaskQuest',
    description: contact ? `View details and interactions for ${contact.name}` : 'View contact details',
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const supabase = createClient();

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Get contact details
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !contact) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <ContactDetail contact={contact} />
    </div>
  );
}