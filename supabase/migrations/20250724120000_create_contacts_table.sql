-- Create contacts table for Personal CRM Integration (Epic 3, Story 3.1)
-- This migration creates the foundational contacts table with all required fields

-- Create contact priority enum
CREATE TYPE contact_priority AS ENUM ('low', 'normal', 'high', 'vip');

-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic contact information
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(100),
  role VARCHAR(100),
  
  -- Profile and media
  avatar_url TEXT,
  notes TEXT,
  
  -- Priority and organization
  priority contact_priority NOT NULL DEFAULT 'normal',
  tags TEXT[], -- Array of custom tags for organization
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_contact_date TIMESTAMP WITH TIME ZONE, -- When last interaction occurred
  
  -- Constraints
  CONSTRAINT contacts_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT contacts_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_company ON public.contacts(company);
CREATE INDEX idx_contacts_priority ON public.contacts(priority);
CREATE INDEX idx_contacts_name_search ON public.contacts USING gin(to_tsvector('english', name));
CREATE INDEX idx_contacts_company_search ON public.contacts USING gin(to_tsvector('english', company));
CREATE INDEX idx_contacts_tags ON public.contacts USING gin(tags);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
CREATE POLICY "Users can view their own contacts" 
  ON public.contacts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" 
  ON public.contacts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
  ON public.contacts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
  ON public.contacts FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create interactions table for contact interaction history (Story 3.3)
CREATE TYPE interaction_type AS ENUM ('call', 'meeting', 'email', 'social', 'task', 'note');

CREATE TABLE IF NOT EXISTS public.contact_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Interaction details
  type interaction_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration_minutes INTEGER, -- For calls and meetings
  
  -- Timestamps
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB, -- Store additional interaction data
  
  CONSTRAINT interaction_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- Create indexes for contact_interactions
CREATE INDEX idx_contact_interactions_contact_id ON public.contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_user_id ON public.contact_interactions(user_id);
CREATE INDEX idx_contact_interactions_type ON public.contact_interactions(type);
CREATE INDEX idx_contact_interactions_date ON public.contact_interactions(interaction_date);

-- Enable RLS for contact_interactions
ALTER TABLE public.contact_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_interactions
CREATE POLICY "Users can view their own contact interactions" 
  ON public.contact_interactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact interactions" 
  ON public.contact_interactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact interactions" 
  ON public.contact_interactions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact interactions" 
  ON public.contact_interactions FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for contact_interactions updated_at
CREATE TRIGGER update_contact_interactions_updated_at
  BEFORE UPDATE ON public.contact_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create follow_ups table for reminder system (Story 3.4)
CREATE TYPE follow_up_status AS ENUM ('pending', 'completed', 'snoozed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Follow-up details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status follow_up_status NOT NULL DEFAULT 'pending',
  
  -- Scheduling
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  snooze_until TIMESTAMP WITH TIME ZONE,
  
  -- Recurrence (for recurring follow-ups)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'yearly'
  recurrence_interval INTEGER DEFAULT 1, -- Every N units (e.g., every 2 weeks)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB
);

-- Create indexes for follow_ups
CREATE INDEX idx_follow_ups_contact_id ON public.follow_ups(contact_id);
CREATE INDEX idx_follow_ups_user_id ON public.follow_ups(user_id);
CREATE INDEX idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX idx_follow_ups_scheduled_date ON public.follow_ups(scheduled_date);
CREATE INDEX idx_follow_ups_recurring ON public.follow_ups(is_recurring) WHERE is_recurring = TRUE;

-- Enable RLS for follow_ups
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for follow_ups
CREATE POLICY "Users can view their own follow ups" 
  ON public.follow_ups FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follow ups" 
  ON public.follow_ups FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follow ups" 
  ON public.follow_ups FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own follow ups" 
  ON public.follow_ups FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger for follow_ups updated_at
CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add contact_id foreign key to tasks table (Story 3.2: Task-Contact Linking)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Create index for task-contact relationships
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON public.tasks(contact_id);

-- Function to update contact's last_contact_date when interaction is logged
CREATE OR REPLACE FUNCTION update_contact_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contact's last_contact_date when an interaction is added
  UPDATE public.contacts 
  SET 
    last_contact_date = NEW.interaction_date,
    updated_at = NOW()
  WHERE id = NEW.contact_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update contact last interaction date
CREATE TRIGGER update_contact_last_interaction_trigger
  AFTER INSERT ON public.contact_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_interaction();

-- Function to automatically log task completion as contact interaction
CREATE OR REPLACE FUNCTION log_task_contact_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log interaction when task is completed and has a contact
  IF NEW.completed = TRUE 
     AND (OLD.completed = FALSE OR OLD.completed IS NULL) 
     AND NEW.contact_id IS NOT NULL THEN
    
    INSERT INTO public.contact_interactions (
      contact_id,
      user_id,
      type,
      title,
      description,
      interaction_date,
      metadata
    )
    VALUES (
      NEW.contact_id,
      NEW.user_id,
      'task',
      'Task Completed: ' || NEW.title,
      NEW.description,
      NOW(),
      jsonb_build_object(
        'task_id', NEW.id,
        'task_complexity', NEW.complexity,
        'xp_earned', NEW.xp_earned
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log task-contact interactions
CREATE TRIGGER log_task_contact_interaction_trigger
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_contact_interaction();

-- Function to handle follow-up completion
CREATE OR REPLACE FUNCTION complete_follow_up()
RETURNS TRIGGER AS $$
BEGIN
  -- When follow-up is marked as completed, create an interaction record
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.contact_interactions (
      contact_id,
      user_id,
      type,
      title,
      description,
      interaction_date,
      metadata
    )
    VALUES (
      NEW.contact_id,
      NEW.user_id,
      'note',
      'Follow-up Completed: ' || NEW.title,
      NEW.description,
      COALESCE(NEW.completed_date, NOW()),
      jsonb_build_object('follow_up_id', NEW.id)
    );
    
    -- Set completed_date if not already set
    IF NEW.completed_date IS NULL THEN
      NEW.completed_date = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow-up completion
CREATE TRIGGER complete_follow_up_trigger
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION complete_follow_up();

-- Grant permissions for all new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contact_interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.follow_ups TO authenticated;

-- Create search function for contacts
CREATE OR REPLACE FUNCTION search_contacts(
  search_user_id UUID,
  search_term TEXT DEFAULT '',
  priority_filter contact_priority DEFAULT NULL,
  company_filter TEXT DEFAULT NULL,
  tag_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(100),
  role VARCHAR(100),
  priority contact_priority,
  tags TEXT[],
  last_contact_date TIMESTAMP WITH TIME ZONE,
  interaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.company,
    c.role,
    c.priority,
    c.tags,
    c.last_contact_date,
    COALESCE(i.interaction_count, 0) as interaction_count
  FROM public.contacts c
  LEFT JOIN (
    SELECT 
      contact_id, 
      COUNT(*) as interaction_count
    FROM public.contact_interactions
    WHERE user_id = search_user_id
    GROUP BY contact_id
  ) i ON c.id = i.contact_id
  WHERE c.user_id = search_user_id
    AND (
      search_term = '' 
      OR c.name ILIKE '%' || search_term || '%'
      OR c.email ILIKE '%' || search_term || '%'
      OR c.company ILIKE '%' || search_term || '%'
      OR search_term = ANY(c.tags)
    )
    AND (priority_filter IS NULL OR c.priority = priority_filter)
    AND (company_filter IS NULL OR c.company ILIKE '%' || company_filter || '%')
    AND (tag_filter IS NULL OR tag_filter = ANY(c.tags))
  ORDER BY 
    CASE c.priority 
      WHEN 'vip' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    c.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on search function
GRANT EXECUTE ON FUNCTION search_contacts(UUID, TEXT, contact_priority, TEXT, TEXT) TO authenticated;