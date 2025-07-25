-- Epic 8, Story 8.4: Email Integration for Task Creation Schema

-- Email provider connections (Gmail, Outlook)
CREATE TABLE email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'gmail', 'outlook'
  email_address VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connection_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, provider, email_address),
  INDEX(user_id, provider)
);

-- Email processing rules
CREATE TABLE email_processing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  rule_description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  
  -- Trigger conditions
  from_addresses TEXT[], -- Array of sender addresses/patterns
  to_addresses TEXT[], -- Array of recipient addresses/patterns
  subject_patterns TEXT[], -- Array of subject line patterns
  body_keywords TEXT[], -- Array of keywords to look for in body
  has_attachments BOOLEAN, -- Null means don't care, true/false for specific requirement
  folder_names TEXT[], -- Specific folders to monitor
  
  -- Task creation settings
  task_title_template VARCHAR(500) DEFAULT 'Email: {{subject}}',
  task_description_template TEXT DEFAULT 'From: {{from}}\nSubject: {{subject}}\n\n{{body}}',
  default_priority VARCHAR(20) DEFAULT 'medium',
  default_complexity VARCHAR(20) DEFAULT 'simple',
  default_category_id UUID REFERENCES categories(id),
  default_project_id UUID REFERENCES projects(id),
  auto_assign_to_user BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(user_id, is_active)
);

-- Processed emails tracking
CREATE TABLE processed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL, -- Provider's message ID
  thread_id VARCHAR(255), -- Provider's thread ID
  from_address VARCHAR(255) NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  received_date TIMESTAMPTZ NOT NULL,
  has_attachments BOOLEAN DEFAULT false,
  folder_name VARCHAR(255),
  labels TEXT[], -- Gmail labels or Outlook categories
  
  -- Processing results
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'ignored', 'failed'
  rule_id UUID REFERENCES email_processing_rules(id),
  task_id UUID REFERENCES tasks(id),
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(connection_id, message_id),
  INDEX(connection_id, processing_status),
  INDEX(message_id),
  INDEX(received_date)
);

-- Email attachments
CREATE TABLE email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_email_id UUID NOT NULL REFERENCES processed_emails(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  file_size INTEGER,
  attachment_id VARCHAR(255), -- Provider's attachment ID
  download_url TEXT,
  is_downloaded BOOLEAN DEFAULT false,
  local_file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(processed_email_id)
);

-- Email sync logs
CREATE TABLE email_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental', 'webhook'
  status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
  emails_processed INTEGER DEFAULT 0,
  emails_imported INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  INDEX(connection_id, started_at)
);

-- Create indexes for performance
CREATE INDEX idx_email_connections_user_provider ON email_connections(user_id, provider);
CREATE INDEX idx_email_processing_rules_user_active ON email_processing_rules(user_id, is_active);
CREATE INDEX idx_processed_emails_connection_status ON processed_emails(connection_id, processing_status);
CREATE INDEX idx_processed_emails_received_date ON processed_emails(received_date);
CREATE INDEX idx_processed_emails_search ON processed_emails USING gin(to_tsvector('english', subject || ' ' || COALESCE(body_text, '')));

-- Enable RLS
ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own email connections" ON email_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own email processing rules" ON email_processing_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access emails from their connections" ON processed_emails
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM email_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access attachments from their emails" ON email_attachments
  FOR ALL USING (
    processed_email_id IN (
      SELECT pe.id FROM processed_emails pe
      JOIN email_connections ec ON pe.connection_id = ec.id
      WHERE ec.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view sync logs for their connections" ON email_sync_logs
  FOR SELECT USING (
    connection_id IN (
      SELECT id FROM email_connections WHERE user_id = auth.uid()
    )
  );

-- Function to process email and create task
CREATE OR REPLACE FUNCTION process_email_to_task(
  p_email_id UUID,
  p_rule_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_email RECORD;
  v_rule RECORD;
  v_task_id UUID;
  v_task_title VARCHAR(500);
  v_task_description TEXT;
  v_connection RECORD;
BEGIN
  -- Get email details
  SELECT * INTO v_email FROM processed_emails WHERE id = p_email_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email not found';
  END IF;
  
  -- Get connection details for user validation
  SELECT * INTO v_connection FROM email_connections WHERE id = v_email.connection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email connection not found';
  END IF;
  
  -- Get processing rule if specified
  IF p_rule_id IS NOT NULL THEN
    SELECT * INTO v_rule FROM email_processing_rules WHERE id = p_rule_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Processing rule not found';
    END IF;
  END IF;
  
  -- Generate task title
  v_task_title := COALESCE(v_rule.task_title_template, 'Email: {{subject}}');
  v_task_title := REPLACE(v_task_title, '{{subject}}', COALESCE(v_email.subject, 'No Subject'));
  v_task_title := REPLACE(v_task_title, '{{from}}', v_email.from_address);
  
  -- Generate task description
  v_task_description := COALESCE(v_rule.task_description_template, 'From: {{from}}\nSubject: {{subject}}\n\n{{body}}');
  v_task_description := REPLACE(v_task_description, '{{from}}', v_email.from_address);
  v_task_description := REPLACE(v_task_description, '{{subject}}', COALESCE(v_email.subject, 'No Subject'));
  v_task_description := REPLACE(v_task_description, '{{body}}', COALESCE(LEFT(v_email.body_text, 1000), 'No content'));
  v_task_description := REPLACE(v_task_description, '{{date}}', v_email.received_date::TEXT);
  
  -- Create task
  INSERT INTO tasks (
    user_id,
    title,
    description,
    priority,
    complexity,
    category_id,
    project_id,
    status,
    source,
    source_metadata
  ) VALUES (
    v_connection.user_id,
    LEFT(v_task_title, 255), -- Ensure title fits in column
    v_task_description,
    COALESCE(v_rule.default_priority, 'medium'),
    COALESCE(v_rule.default_complexity, 'simple'),
    v_rule.default_category_id,
    v_rule.default_project_id,
    'todo',
    'email',
    jsonb_build_object(
      'email_id', v_email.id,
      'message_id', v_email.message_id,
      'from_address', v_email.from_address,
      'subject', v_email.subject,
      'received_date', v_email.received_date,
      'rule_id', p_rule_id
    )
  ) RETURNING id INTO v_task_id;
  
  -- Update email processing status
  UPDATE processed_emails SET
    processing_status = 'processed',
    rule_id = p_rule_id,
    task_id = v_task_id,
    processed_at = now()
  WHERE id = p_email_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find matching processing rule for email
CREATE OR REPLACE FUNCTION find_matching_email_rule(
  p_user_id UUID,
  p_from_address VARCHAR(255),
  p_to_addresses TEXT[],
  p_subject VARCHAR(500),
  p_body_text TEXT,
  p_has_attachments BOOLEAN,
  p_folder_name VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
  v_rule_id UUID;
  v_rule RECORD;
BEGIN
  -- Find the highest priority matching rule
  FOR v_rule IN 
    SELECT * FROM email_processing_rules 
    WHERE user_id = p_user_id AND is_active = true
    ORDER BY priority DESC, created_at ASC
  LOOP
    -- Check from address patterns
    IF v_rule.from_addresses IS NOT NULL AND array_length(v_rule.from_addresses, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_rule.from_addresses) AS pattern
        WHERE p_from_address ILIKE pattern
      ) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Check to address patterns
    IF v_rule.to_addresses IS NOT NULL AND array_length(v_rule.to_addresses, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_rule.to_addresses) AS pattern
        WHERE p_to_addresses && ARRAY[pattern]
      ) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Check subject patterns
    IF v_rule.subject_patterns IS NOT NULL AND array_length(v_rule.subject_patterns, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_rule.subject_patterns) AS pattern
        WHERE p_subject ILIKE pattern
      ) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Check body keywords
    IF v_rule.body_keywords IS NOT NULL AND array_length(v_rule.body_keywords, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_rule.body_keywords) AS keyword
        WHERE p_body_text ILIKE '%' || keyword || '%'
      ) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- Check attachment requirement
    IF v_rule.has_attachments IS NOT NULL AND v_rule.has_attachments != p_has_attachments THEN
      CONTINUE;
    END IF;
    
    -- Check folder names
    IF v_rule.folder_names IS NOT NULL AND array_length(v_rule.folder_names, 1) > 0 THEN
      IF NOT (p_folder_name = ANY(v_rule.folder_names)) THEN
        CONTINUE;
      END IF;
    END IF;
    
    -- If we get here, this rule matches
    RETURN v_rule.id;
  END LOOP;
  
  -- No matching rule found
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to search processed emails
CREATE OR REPLACE FUNCTION search_processed_emails(
  p_user_id UUID,
  p_search_term TEXT,
  p_connection_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  email_id UUID,
  subject VARCHAR(500),
  from_address VARCHAR(255),
  received_date TIMESTAMPTZ,
  processing_status VARCHAR(50),
  task_id UUID,
  provider VARCHAR(50),
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pe.id,
    pe.subject,
    pe.from_address,
    pe.received_date,
    pe.processing_status,
    pe.task_id,
    ec.provider,
    ts_rank(to_tsvector('english', pe.subject || ' ' || COALESCE(pe.body_text, '')), plainto_tsquery('english', p_search_term)) as rank
  FROM processed_emails pe
  JOIN email_connections ec ON pe.connection_id = ec.id
  WHERE ec.user_id = p_user_id
    AND ec.is_active = true
    AND (p_connection_id IS NULL OR ec.id = p_connection_id)
    AND (
      to_tsvector('english', pe.subject || ' ' || COALESCE(pe.body_text, '')) @@ plainto_tsquery('english', p_search_term)
      OR pe.from_address ILIKE '%' || p_search_term || '%'
    )
  ORDER BY rank DESC, pe.received_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;