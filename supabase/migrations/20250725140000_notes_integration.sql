-- Epic 8, Story 8.3: Note-Taking App Connections Schema

-- Note app connections (Notion, Obsidian, etc.)
CREATE TABLE note_app_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'notion', 'obsidian'
  provider_account_id VARCHAR(255),
  provider_workspace_id VARCHAR(255),
  workspace_name VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connection_config JSONB DEFAULT '{}', -- Provider-specific config
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, provider, provider_workspace_id),
  INDEX(user_id, provider)
);

-- Note pages/documents from connected apps
CREATE TABLE note_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES note_app_connections(id) ON DELETE CASCADE,
  page_id VARCHAR(255) NOT NULL, -- Provider's page/document ID
  parent_id VARCHAR(255), -- Parent page for hierarchical notes
  title VARCHAR(500) NOT NULL,
  url TEXT, -- Direct link to the page
  content_preview TEXT, -- First few lines of content
  page_type VARCHAR(100), -- 'page', 'database', 'document', 'note'
  properties JSONB DEFAULT '{}', -- Provider-specific properties
  last_edited_time TIMESTAMPTZ,
  created_time TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(connection_id, page_id),
  INDEX(connection_id, page_type),
  INDEX(title)
);

-- Links between tasks and note pages
CREATE TABLE task_note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  note_page_id UUID NOT NULL REFERENCES note_pages(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL DEFAULT 'reference', -- 'reference', 'documentation', 'meeting_notes'
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT, -- User notes about the connection
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(task_id, note_page_id),
  INDEX(task_id),
  INDEX(note_page_id)
);

-- Template mappings for creating pages from tasks
CREATE TABLE note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES note_app_connections(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(100) NOT NULL, -- 'task_page', 'project_page', 'meeting_notes'
  provider_template_id VARCHAR(255), -- Reference to provider template
  template_config JSONB NOT NULL, -- Template structure and mapping
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX(connection_id, template_type)
);

-- Search index for note content
CREATE TABLE note_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_page_id UUID NOT NULL REFERENCES note_pages(id) ON DELETE CASCADE,
  search_vector tsvector,
  content_text TEXT,
  indexed_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(note_page_id)
);

-- Sync logs for note app integrations
CREATE TABLE note_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES note_app_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental', 'page_update'
  status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
  pages_processed INTEGER DEFAULT 0,
  pages_created INTEGER DEFAULT 0,
  pages_updated INTEGER DEFAULT 0,
  pages_deleted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  INDEX(connection_id, started_at)
);

-- Create indexes for performance
CREATE INDEX idx_note_app_connections_user_provider ON note_app_connections(user_id, provider);
CREATE INDEX idx_note_pages_connection_id ON note_pages(connection_id);
CREATE INDEX idx_note_pages_title_search ON note_pages USING gin(to_tsvector('english', title));
CREATE INDEX idx_task_note_links_task_id ON task_note_links(task_id);
CREATE INDEX idx_note_search_vector ON note_search_index USING gin(search_vector);

-- Enable RLS
ALTER TABLE note_app_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own note app connections" ON note_app_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access pages from their connections" ON note_pages
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM note_app_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage links for their tasks" ON task_note_links
  FOR ALL USING (
    task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
    OR created_by_user_id = auth.uid()
  );

CREATE POLICY "Users can access templates from their connections" ON note_templates
  FOR ALL USING (
    connection_id IN (
      SELECT id FROM note_app_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access search index for their pages" ON note_search_index
  FOR SELECT USING (
    note_page_id IN (
      SELECT np.id FROM note_pages np
      JOIN note_app_connections nac ON np.connection_id = nac.id
      WHERE nac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view sync logs for their connections" ON note_sync_logs
  FOR SELECT USING (
    connection_id IN (
      SELECT id FROM note_app_connections WHERE user_id = auth.uid()
    )
  );

-- Function to create note page from task
CREATE OR REPLACE FUNCTION create_note_page_from_task(
  p_task_id UUID,
  p_connection_id UUID,
  p_template_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task RECORD;
  v_connection RECORD;
  v_template RECORD;
  v_page_id UUID;
  v_page_title VARCHAR(500);
  v_page_content TEXT;
BEGIN
  -- Get task details
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Get connection details
  SELECT * INTO v_connection FROM note_app_connections WHERE id = p_connection_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Note app connection not found';
  END IF;
  
  -- Get template if specified
  IF p_template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM note_templates WHERE id = p_template_id;
  END IF;
  
  -- Generate page title and content
  v_page_title := 'Task: ' || v_task.title;
  v_page_content := 'Task created from TaskQuest' || E'\n\n' ||
    'Title: ' || v_task.title || E'\n' ||
    CASE WHEN v_task.description IS NOT NULL THEN 'Description: ' || v_task.description || E'\n' ELSE '' END ||
    'Priority: ' || v_task.priority || E'\n' ||
    'Complexity: ' || v_task.complexity || E'\n' ||
    'Status: ' || v_task.status || E'\n' ||
    CASE WHEN v_task.due_date IS NOT NULL THEN 'Due Date: ' || v_task.due_date || E'\n' ELSE '' END;
  
  -- Create note page record (actual API call would be handled by application)
  INSERT INTO note_pages (
    connection_id,
    page_id,
    title,
    content_preview,
    page_type,
    properties,
    created_time,
    last_edited_time
  ) VALUES (
    p_connection_id,
    'temp_' || gen_random_uuid()::text, -- Temporary ID, would be replaced by actual API response
    v_page_title,
    LEFT(v_page_content, 200),
    'page',
    jsonb_build_object(
      'source', 'taskquest',
      'task_id', p_task_id,
      'template_used', p_template_id
    ),
    now(),
    now()
  ) RETURNING id INTO v_page_id;
  
  -- Create task-note link
  INSERT INTO task_note_links (
    task_id,
    note_page_id,
    link_type,
    created_by_user_id,
    notes
  ) VALUES (
    p_task_id,
    v_page_id,
    'documentation',
    v_task.user_id,
    'Page created automatically from task'
  );
  
  RETURN v_page_id;
END;
$$ LANGUAGE plpgsql;

-- Function to search notes
CREATE OR REPLACE FUNCTION search_note_pages(
  p_user_id UUID,
  p_search_term TEXT,
  p_connection_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  page_id UUID,
  title VARCHAR(500),
  content_preview TEXT,
  url TEXT,
  provider VARCHAR(50),
  workspace_name VARCHAR(255),
  last_edited_time TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    np.id,
    np.title,
    np.content_preview,
    np.url,
    nac.provider,
    nac.workspace_name,
    np.last_edited_time,
    ts_rank(nsi.search_vector, plainto_tsquery('english', p_search_term)) as rank
  FROM note_pages np
  JOIN note_app_connections nac ON np.connection_id = nac.id
  LEFT JOIN note_search_index nsi ON np.id = nsi.note_page_id
  WHERE nac.user_id = p_user_id
    AND nac.is_active = true
    AND np.is_archived = false
    AND (p_connection_id IS NULL OR nac.id = p_connection_id)
    AND (
      nsi.search_vector @@ plainto_tsquery('english', p_search_term)
      OR np.title ILIKE '%' || p_search_term || '%'
    )
  ORDER BY rank DESC, np.last_edited_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update search index
CREATE OR REPLACE FUNCTION update_note_search_index()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO note_search_index (note_page_id, search_vector, content_text)
  VALUES (
    NEW.id,
    to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content_preview, '')),
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content_preview, '')
  )
  ON CONFLICT (note_page_id) 
  DO UPDATE SET
    search_vector = to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content_preview, '')),
    content_text = COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content_preview, ''),
    indexed_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search index
CREATE TRIGGER trigger_update_note_search_index
  AFTER INSERT OR UPDATE ON note_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_note_search_index();