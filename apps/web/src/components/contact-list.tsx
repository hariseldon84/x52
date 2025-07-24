'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ContactCard } from './contact-card';
import { ContactForm } from './contact-form';
import { Search, Plus, Filter, Users, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactPriority = Database['public']['Enums']['contact_priority'];

interface ContactListProps {
  className?: string;
}

interface FilterState {
  priority: ContactPriority | 'all';
  company: string;
  tags: string[];
}

export function ContactList({ className = '' }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    priority: 'all',
    company: '',
    tags: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  const supabase = createClient();

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      setContacts(data || []);
      
      // Extract unique tags and companies for filtering
      const allTags = new Set<string>();
      const allCompanies = new Set<string>();
      
      data?.forEach(contact => {
        contact.tags?.forEach(tag => allTags.add(tag));
        if (contact.company) allCompanies.add(contact.company);
      });
      
      setAvailableTags(Array.from(allTags).sort());
      setAvailableCompanies(Array.from(allCompanies).sort());
      
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search contacts
  useEffect(() => {
    let filtered = contacts;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.company?.toLowerCase().includes(search) ||
        contact.role?.toLowerCase().includes(search) ||
        contact.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(contact => contact.priority === filters.priority);
    }

    // Apply company filter
    if (filters.company) {
      filtered = filtered.filter(contact => 
        contact.company?.toLowerCase().includes(filters.company.toLowerCase())
      );
    }

    // Apply tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(contact =>
        contact.tags?.some(tag => filters.tags.includes(tag))
      );
    }

    // Sort by priority (VIP first) and then by name
    filtered.sort((a, b) => {
      const priorityOrder = { vip: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name);
    });

    setFilteredContacts(filtered);
  }, [contacts, searchTerm, filters]);

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = () => {
    setEditingContact(null);
    setIsFormOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleSaveContact = (savedContact: Contact) => {
    if (editingContact) {
      // Update existing contact
      setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
    } else {
      // Add new contact
      setContacts(prev => [savedContact, ...prev]);
    }
    setIsFormOpen(false);
    setEditingContact(null);
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      alert('Failed to delete contact: ' + err.message);
    }
  };

  const clearFilters = () => {
    setFilters({
      priority: 'all',
      company: '',
      tags: [],
    });
    setSearchTerm('');
  };

  const toggleTagFilter = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading contacts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={loadContacts} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
          <Badge variant="outline">{contacts.length}</Badge>
        </div>
        <Button onClick={handleAddContact}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-gray-100' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-800' },
                  { value: 'vip', label: 'VIP', color: 'bg-purple-100 text-purple-800' },
                  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
                  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
                  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
                ].map((priority) => (
                  <button
                    key={priority.value}
                    onClick={() => setFilters(prev => ({ ...prev, priority: priority.value as any }))}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                      filters.priority === priority.value
                        ? 'border-blue-500 ' + priority.color
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTagFilter(tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                        filters.tags.includes(tag)
                          ? 'border-blue-500 bg-blue-100 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
              <span className="text-sm text-gray-600">
                Showing {filteredContacts.length} of {contacts.length} contacts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contacts Grid */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {contacts.length === 0 ? 'No contacts yet' : 'No contacts match your filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {contacts.length === 0 
              ? 'Add your first contact to start building your network.'
              : 'Try adjusting your search terms or filters.'
            }
          </p>
          {contacts.length === 0 && (
            <Button onClick={handleAddContact}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleEditContact}
              onDelete={handleDeleteContact}
            />
          ))}
        </div>
      )}

      {/* Contact Form Modal */}
      <ContactForm
        contact={editingContact}
        onSave={handleSaveContact}
        onCancel={() => {
          setIsFormOpen(false);
          setEditingContact(null);
        }}
        isOpen={isFormOpen}
      />
    </div>
  );
}