-- SQL Script to update the users table in Supabase
-- Run this script in the Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS aadhar_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS department VARCHAR(255),
ADD COLUMN IF NOT EXISTS badge_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
ADD COLUMN IF NOT EXISTS bar_council VARCHAR(255),
ADD COLUMN IF NOT EXISTS experience_years INTEGER,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';

-- Case tracking + FIR workflow fields for citizen complaint flow
ALTER TABLE public.cases
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS complainant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS complainant_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS complainant_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS complainant_location VARCHAR(255),
ADD COLUMN IF NOT EXISTS complainant_pincode VARCHAR(10),
ADD COLUMN IF NOT EXISTS nearest_police_station VARCHAR(255),
ADD COLUMN IF NOT EXISTS evidence_text TEXT,
ADD COLUMN IF NOT EXISTS proof_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS case_strength INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fir_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS fir_registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS complaint_summary TEXT,
ADD COLUMN IF NOT EXISTS complaint_form_json JSONB,
ADD COLUMN IF NOT EXISTS case_analysis JSONB,
ADD COLUMN IF NOT EXISTS escalation_draft TEXT,
ADD COLUMN IF NOT EXISTS incident_date DATE,
ADD COLUMN IF NOT EXISTS incident_time TIME,
ADD COLUMN IF NOT EXISTS accused_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS witness_details TEXT,
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_protected_case BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS protected_reference_id VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_cases_protected_reference_id ON public.cases(protected_reference_id);

CREATE INDEX IF NOT EXISTS idx_cases_tracking_id ON public.cases(tracking_id);

-- Lawyer help request workflow
CREATE TABLE IF NOT EXISTS public.lawyer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_tracking_id VARCHAR(60) UNIQUE NOT NULL,
  linked_case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  linked_case_tracking_id VARCHAR(60),
  lawyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255),
  requester_phone VARCHAR(20) NOT NULL,
  requester_city VARCHAR(100),
  requester_case_number VARCHAR(100),
  requester_message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  progress_notes TEXT,
  lawyer_response_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_lawyer_requests_lawyer_id ON public.lawyer_requests(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_lawyer_requests_status ON public.lawyer_requests(status);
CREATE INDEX IF NOT EXISTS idx_lawyer_requests_tracking ON public.lawyer_requests(request_tracking_id);

-- Secure real-time victim-police communication
CREATE TABLE IF NOT EXISTS public.case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('victim', 'police', 'admin')),
  sender_ref VARCHAR(100),
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_case_messages_case_id ON public.case_messages(case_id);
