import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Mail, 
  Phone, 
  Building, 
  MessageSquare, 
  MoreVertical,
  Star,
  StarOff
} from "lucide-react";
import { format } from "date-fns";

interface ContactItemProps {
  contact: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    priority: "low" | "medium" | "high";
    tags: string[];
    notes?: string;
    lastContact?: string;
    createdAt: string;
  };
}

export default function ContactItem({ contact }: ContactItemProps) {
  const priorityColors = {
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    medium: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    high: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="github-secondary border-github-border hover:border-orange-500/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="" alt={contact.name} />
            <AvatarFallback className="github-dark text-primary">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-primary truncate">{contact.name}</h3>
              {contact.priority === "high" && (
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
              )}
            </div>

            {(contact.position || contact.company) && (
              <div className="flex items-center space-x-1 text-sm text-secondary mb-2">
                <Building className="w-3 h-3" />
                <span className="truncate">
                  {contact.position}
                  {contact.position && contact.company && " at "}
                  {contact.company}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-3 mb-2 text-xs text-secondary">
              {contact.email && (
                <div className="flex items-center space-x-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-32">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-3 h-3" />
                  <span>{contact.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={priorityColors[contact.priority]}>
                  {contact.priority}
                </Badge>
                {contact.tags.length > 0 && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {contact.tags[0]}
                    {contact.tags.length > 1 && ` +${contact.tags.length - 1}`}
                  </Badge>
                )}
              </div>

              {contact.lastContact && (
                <div className="flex items-center space-x-1 text-xs text-secondary">
                  <MessageSquare className="w-3 h-3" />
                  <span>{format(new Date(contact.lastContact), "MMM d")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {contact.notes && (
          <div className="mt-3 pt-3 border-t border-github-border">
            <p className="text-sm text-secondary line-clamp-2">{contact.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}