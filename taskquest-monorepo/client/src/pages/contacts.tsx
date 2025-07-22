import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/ui/navigation";
import ContactItem from "@/components/ui/contact-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Contacts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || contactsLoading) {
    return (
      <div className="min-h-screen github-dark flex items-center justify-center">
        <div className="text-primary">Loading contacts...</div>
      </div>
    );
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || contact.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const highPriorityContacts = filteredContacts.filter(contact => contact.priority === "high");
  const mediumPriorityContacts = filteredContacts.filter(contact => contact.priority === "medium");
  const lowPriorityContacts = filteredContacts.filter(contact => contact.priority === "low");

  return (
    <div className="min-h-screen github-dark">
      {/* Header */}
      <header className="github-secondary border-b github-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-primary">CRM</h1>
          <Button 
            size="sm"
            className="bg-accent-blue hover:bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 github-secondary border-github-border text-primary"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={priorityFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("all")}
              className={priorityFilter === "all" ? "bg-accent-blue" : "border-github-border"}
            >
              All
            </Button>
            <Button
              variant={priorityFilter === "high" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("high")}
              className={priorityFilter === "high" ? "bg-accent-crimson" : "border-github-border"}
            >
              High Priority
            </Button>
            <Button
              variant={priorityFilter === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("medium")}
              className={priorityFilter === "medium" ? "bg-accent-orange" : "border-github-border"}
            >
              Medium
            </Button>
            <Button
              variant={priorityFilter === "low" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriorityFilter("low")}
              className={priorityFilter === "low" ? "bg-green-600" : "border-github-border"}
            >
              Low
            </Button>
          </div>
        </div>

        {/* Contact Stats */}
        <Card className="github-secondary border-github-border mb-6">
          <CardHeader>
            <CardTitle className="text-primary">Contact Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">{contacts.length}</div>
                <div className="text-xs text-secondary">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{highPriorityContacts.length}</div>
                <div className="text-xs text-secondary">High Priority</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">{mediumPriorityContacts.length}</div>
                <div className="text-xs text-secondary">Medium</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{lowPriorityContacts.length}</div>
                <div className="text-xs text-secondary">Low</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Contacts */}
        {highPriorityContacts.length > 0 && (priorityFilter === "all" || priorityFilter === "high") && (
          <Card className="github-secondary border-github-border mb-6">
            <CardHeader>
              <CardTitle className="text-primary flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                High Priority Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {highPriorityContacts.map((contact) => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Contacts */}
        <Card className="github-secondary border-github-border">
          <CardHeader>
            <CardTitle className="text-primary">
              {priorityFilter === "all" ? "All Contacts" : `${priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)} Priority Contacts`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <ContactItem key={contact.id} contact={contact} />
              ))
            ) : (
              <div className="text-center py-8 text-secondary">
                {searchTerm ? "No contacts match your search." : "No contacts yet. Add your first contact to get started!"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button className="bg-accent-orange hover:bg-orange-600 text-white p-4 h-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Follow-up
          </Button>
          <Button className="bg-accent-blue hover:bg-blue-600 text-white p-4 h-auto">
            <Search className="w-4 h-4 mr-2" />
            Import Contacts
          </Button>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <Button 
          size="lg"
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <Navigation currentTab="contacts" />
    </div>
  );
}
