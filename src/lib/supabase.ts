import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  storage_used: number;
  storage_limit: number;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: string;
  last_accessed: string | null;
}
