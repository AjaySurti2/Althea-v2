import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  email: string;
  name: string;
  source: string;
  converted_to_user_id: string | null;
  created_at: string;
};

export type FamilyMember = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  date_of_birth: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  user_id: string;
  family_member_id: string | null;
  tone: 'friendly' | 'professional' | 'empathetic';
  language_level: 'simple' | 'moderate' | 'technical';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

export type FileRecord = {
  id: string;
  session_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  extracted_text: string | null;
  validation_status: 'pending' | 'validated' | 'rejected';
  created_at: string;
};

export type HealthMetric = {
  id: string;
  session_id: string;
  user_id: string;
  family_member_id: string | null;
  metric_type: string;
  metric_value: string;
  metric_unit: string | null;
  recorded_date: string;
  notes: string | null;
  created_at: string;
};

export type FamilyPattern = {
  id: string;
  user_id: string;
  pattern_type: string;
  affected_members: string[];
  risk_level: 'low' | 'moderate' | 'high';
  description: string;
  detected_at: string;
};

export type AISummary = {
  id: string;
  session_id: string;
  user_id: string;
  summary_text: string;
  doctor_questions: string[];
  health_insights: string | null;
  created_at: string;
};

export type ReportPdf = {
  id: string;
  session_id: string;
  user_id: string;
  storage_path: string;
  created_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  family_member_id: string | null;
  reminder_type: 'checkup' | 'medication' | 'test' | 'followup';
  title: string;
  description: string | null;
  due_date: string;
  completed: boolean;
  created_at: string;
};
