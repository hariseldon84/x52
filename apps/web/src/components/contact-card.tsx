'use client';

import { useState } from 'react';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Trash2, Edit2, Mail, Phone, Building, User, Calendar, MessageSquare, Eye } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type Contact = Database['public']['Tables']['contacts']['Row'];

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  className?: string;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  vip: 'bg-purple-100 text-purple-800',
};

const priorityLabels = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  vip: 'VIP',
};

export function ContactCard({ contact, onEdit, onDelete, className = '' }: ContactCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${contact.name}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(contact.id);
    } catch (error) {
      console.error('Error deleting contact:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatLastContactDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              {contact.avatar_url ? (
                <img src={contact.avatar_url} alt={contact.name} className="rounded-full" />
              ) : (
                <div className="flex items-center justify-center h-full w-full bg-gray-200 rounded-full">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">{contact.name}</h3>
              {contact.role && contact.company && (
                <p className="text-sm text-gray-600">
                  {contact.role} at {contact.company}
                </p>
              )}
              {contact.role && !contact.company && (
                <p className="text-sm text-gray-600">{contact.role}</p>
              )}
              {!contact.role && contact.company && (
                <p className="text-sm text-gray-600">{contact.company}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={priorityColors[contact.priority]}>
              {priorityLabels[contact.priority]}
            </Badge>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                className="h-8 w-8 p-0"
                title="View contact details and tasks"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(contact)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {contact.email && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <a 
                href={`mailto:${contact.email}`}
                className="hover:text-blue-600 hover:underline"
              >
                {contact.email}
              </a>
            </div>
          )}
          
          {contact.phone && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <a 
                href={`tel:${contact.phone}`}
                className="hover:text-blue-600 hover:underline"
              >
                {contact.phone}
              </a>
            </div>
          )}
          
          {contact.company && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Building className="h-4 w-4" />
              <span>{contact.company}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Last contact: {formatLastContactDate(contact.last_contact_date)}</span>
          </div>
          
          {contact.notes && (
            <div className="flex items-start space-x-2 text-sm text-gray-600">
              <MessageSquare className="h-4 w-4 mt-0.5" />
              <p className="flex-1 line-clamp-2">{contact.notes}</p>
            </div>
          )}
          
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}