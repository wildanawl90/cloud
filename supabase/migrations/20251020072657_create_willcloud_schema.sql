/*
  # WillCloud Database Schema
  
  Complete cloud storage application schema with user authentication and file management.
  
  ## 1. New Tables
  
  ### `users`
  Extended user profile information linked to Supabase auth
  - `id` (uuid, primary key) - References auth.users
  - `email` (text, unique, not null) - User email address
  - `full_name` (text) - User's full name
  - `storage_used` (bigint, default 0) - Total bytes used by user
  - `storage_limit` (bigint, default 5GB) - Maximum storage allowed
  - `created_at` (timestamptz, default now()) - Account creation timestamp
  - `updated_at` (timestamptz, default now()) - Last update timestamp
  
  ### `files`
  File metadata and storage information
  - `id` (uuid, primary key) - Unique file identifier
  - `user_id` (uuid, not null) - Owner of the file (references users)
  - `filename` (text, not null) - Original filename
  - `file_size` (bigint, not null) - File size in bytes
  - `mime_type` (text, not null) - File MIME type
  - `storage_path` (text, not null) - Path in Supabase Storage
  - `uploaded_at` (timestamptz, default now()) - Upload timestamp
  - `last_accessed` (timestamptz) - Last download/access time
  
  ## 2. Security
  
  ### RLS Policies
  
  #### users table
  - Enable RLS on users table
  - Users can read their own profile
  - Users can update their own profile
  - Users can insert their own profile on signup
  
  #### files table
  - Enable RLS on files table
  - Users can view only their own files
  - Users can insert their own files
  - Users can update their own files
  - Users can delete their own files
  
  ## 3. Indexes
  - Index on files.user_id for fast file listing
  - Index on files.uploaded_at for sorting
  
  ## 4. Triggers
  - Auto-update updated_at timestamp on users table
*/

-- Create users profile table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  storage_used bigint DEFAULT 0,
  storage_limit bigint DEFAULT 5368709120, -- 5GB in bytes
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  last_accessed timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for files table
CREATE POLICY "Users can view own files"
  ON files FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON files FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();