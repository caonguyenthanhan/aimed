-- ============================================================================
-- SYNC INFRASTRUCTURE MIGRATION
-- Adds support for hybrid device + login based data synchronization
-- ============================================================================

-- Device Profiles: Track individual devices and their linked accounts
CREATE TABLE IF NOT EXISTS device_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_access TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_preference TEXT DEFAULT 'hybrid', -- 'cloud' or 'hybrid'
  CONSTRAINT device_profiles_user_id_fk FOREIGN KEY (user_id) 
    REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS device_profiles_device_id_idx ON device_profiles(device_id);
CREATE INDEX IF NOT EXISTS device_profiles_user_id_idx ON device_profiles(user_id);

-- Device Linked Accounts: Track multiple devices linked to a single user
CREATE TABLE IF NOT EXISTS device_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_primary BOOLEAN DEFAULT false,
  CONSTRAINT device_linked_accounts_user_id_fk FOREIGN KEY (user_id) 
    REFERENCES auth_users(id) ON DELETE CASCADE,
  CONSTRAINT device_linked_accounts_device_id_fk FOREIGN KEY (device_id) 
    REFERENCES device_profiles(device_id) ON DELETE CASCADE,
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS device_linked_accounts_user_id_idx ON device_linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS device_linked_accounts_device_id_idx ON device_linked_accounts(device_id);

-- Conversation Sync Status: Track sync state of conversations across devices
CREATE TABLE IF NOT EXISTS conversation_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced', -- 'pending', 'synced', 'conflict'
  last_synced_at TIMESTAMPTZ,
  local_version INTEGER DEFAULT 0,
  cloud_version INTEGER DEFAULT 0,
  conflict_resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversation_sync_status_conversation_id_fk 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT conversation_sync_status_device_id_fk 
    FOREIGN KEY (device_id) REFERENCES device_profiles(device_id) ON DELETE CASCADE,
  UNIQUE(conversation_id, device_id)
);

CREATE INDEX IF NOT EXISTS conversation_sync_status_conversation_id_idx 
  ON conversation_sync_status(conversation_id);
CREATE INDEX IF NOT EXISTS conversation_sync_status_device_id_idx 
  ON conversation_sync_status(device_id);
CREATE INDEX IF NOT EXISTS conversation_sync_status_sync_status_idx 
  ON conversation_sync_status(sync_status);

-- Sync Queue: Queue pending sync operations for offline-first support
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- 'conversation', 'message', etc.
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sync_queue_device_id_fk 
    FOREIGN KEY (device_id) REFERENCES device_profiles(device_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sync_queue_device_id_idx ON sync_queue(device_id);
CREATE INDEX IF NOT EXISTS sync_queue_status_idx ON sync_queue(status);
CREATE INDEX IF NOT EXISTS sync_queue_created_at_idx ON sync_queue(created_at);

-- Agent Suggestions: Track suggested agents in conversations
CREATE TABLE IF NOT EXISTS agent_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  agent_id TEXT NOT NULL,
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_action TEXT, -- 'embedded', 'opened', 'dismissed', null
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_suggestions_conversation_id_fk 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS agent_suggestions_conversation_id_idx 
  ON agent_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS agent_suggestions_agent_id_idx 
  ON agent_suggestions(agent_id);

-- Content Suggestions: Track suggested content (YouTube videos, music, etc) in tam-su
CREATE TABLE IF NOT EXISTS content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  content_type TEXT NOT NULL, -- 'youtube', 'music', 'podcast', 'audiobook'
  content_id TEXT NOT NULL,
  content_metadata JSONB, -- title, author, url, duration, etc.
  suggested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_action TEXT, -- 'viewed', 'played', 'bookmarked', 'dismissed', null
  acted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_suggestions_conversation_id_fk 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS content_suggestions_conversation_id_idx 
  ON content_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS content_suggestions_content_type_idx 
  ON content_suggestions(content_type);
CREATE INDEX IF NOT EXISTS content_suggestions_created_at_idx 
  ON content_suggestions(created_at);

-- Medical Appointments: Store appointment bookings and treatment plans
CREATE TABLE IF NOT EXISTS medical_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  doctor_id TEXT,
  appointment_type TEXT NOT NULL, -- 'consultation', 'follow_up', 'treatment'
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB, -- treatment plan, prescriptions, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT medical_appointments_user_id_fk 
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS medical_appointments_user_id_idx ON medical_appointments(user_id);
CREATE INDEX IF NOT EXISTS medical_appointments_scheduled_at_idx ON medical_appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS medical_appointments_status_idx ON medical_appointments(status);

-- Treatment Plans: Store treatment information and progress
CREATE TABLE IF NOT EXISTS treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  appointment_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  medications JSONB, -- array of medication details
  activities JSONB, -- recommended activities/exercises
  checkpoints JSONB, -- progress checkpoints with dates
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT treatment_plans_user_id_fk 
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
  CONSTRAINT treatment_plans_appointment_id_fk 
    FOREIGN KEY (appointment_id) REFERENCES medical_appointments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS treatment_plans_user_id_idx ON treatment_plans(user_id);
CREATE INDEX IF NOT EXISTS treatment_plans_status_idx ON treatment_plans(status);

-- Activity Updates: Track user activities and progress
CREATE TABLE IF NOT EXISTS activity_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'exercise', 'medication', 'mood', 'measurement'
  activity_data JSONB NOT NULL, -- data specific to activity type
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT activity_updates_user_id_fk 
    FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS activity_updates_user_id_idx ON activity_updates(user_id);
CREATE INDEX IF NOT EXISTS activity_updates_activity_type_idx ON activity_updates(activity_type);
CREATE INDEX IF NOT EXISTS activity_updates_recorded_at_idx ON activity_updates(recorded_at);
