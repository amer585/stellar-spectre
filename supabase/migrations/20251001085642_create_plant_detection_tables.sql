/*
  # Plant Detection System Database Schema

  ## Overview
  This migration creates the complete database schema for the plant detection AI system,
  including tables for image metadata, training sessions, model deployments, and analysis history.

  ## New Tables

  1. **image_metadata**
     - `id` (text, primary key) - Unique identifier for each image
     - `user_id` (uuid, foreign key) - Links to auth.users
     - `title` (text) - Descriptive title
     - `source` (text) - Source of the image (PlantCLEF, ImageNet, etc.)
     - `category` (text) - 'plant' or 'non_plant'
     - `file_path` (text) - Storage path in Supabase
     - `metadata` (jsonb) - Additional metadata (plant type, lighting, etc.)
     - `created_at` (timestamptz) - Upload timestamp

  2. **ai_training_sessions**
     - `id` (uuid, primary key) - Unique training session ID
     - `user_id` (uuid, foreign key) - User who initiated training
     - `model_name` (text) - Name/version of the model
     - `model_path` (text) - Storage path for trained model
     - `status` (text) - 'pending', 'training', 'completed', 'failed'
     - `training_images_count` (integer) - Number of images used
     - `accuracy_improvement` (numeric) - Final accuracy percentage
     - `validation_metrics` (jsonb) - Detailed metrics (mAP, precision, recall)
     - `training_config` (jsonb) - Training configuration
     - `started_at` (timestamptz) - Training start time
     - `completed_at` (timestamptz) - Training completion time
     - `trained_at` (timestamptz) - Model training timestamp
     - `created_at` (timestamptz) - Record creation time

  3. **model_deployments**
     - `id` (uuid, primary key) - Deployment ID
     - `user_id` (uuid, foreign key) - User who deployed
     - `model_id` (text) - Reference to trained model
     - `model_type` (text) - Type of model (yolov8_cloud, yolov8_edge)
     - `deployment_status` (text) - 'active', 'inactive', 'failed'
     - `endpoint_url` (text) - API endpoint URL
     - `created_at` (timestamptz) - Deployment timestamp

  4. **plant_analyses**
     - `id` (uuid, primary key) - Analysis ID
     - `user_id` (uuid, foreign key) - User who performed analysis
     - `image_url` (text) - URL of analyzed image
     - `analysis_results` (jsonb) - Detection results
     - `model_used` (text) - Model identifier used
     - `confidence_score` (numeric) - Overall confidence
     - `processing_time_ms` (integer) - Time taken for analysis
     - `created_at` (timestamptz) - Analysis timestamp

  ## Security
  - All tables have RLS enabled
  - Users can only access their own data
  - Authenticated users required for all operations
*/

-- Create image_metadata table
CREATE TABLE IF NOT EXISTS image_metadata (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  source text NOT NULL,
  category text NOT NULL CHECK (category IN ('plant', 'non_plant')),
  file_path text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create ai_training_sessions table
CREATE TABLE IF NOT EXISTS ai_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model_name text NOT NULL,
  model_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'training', 'completed', 'failed')),
  training_images_count integer DEFAULT 0,
  accuracy_improvement numeric,
  validation_metrics jsonb DEFAULT '{}'::jsonb,
  training_config jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  trained_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create model_deployments table
CREATE TABLE IF NOT EXISTS model_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model_id text NOT NULL,
  model_type text NOT NULL,
  deployment_status text NOT NULL DEFAULT 'active' CHECK (deployment_status IN ('active', 'inactive', 'failed')),
  endpoint_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create plant_analyses table
CREATE TABLE IF NOT EXISTS plant_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text,
  analysis_results jsonb DEFAULT '{}'::jsonb,
  model_used text,
  confidence_score numeric,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_metadata
CREATE POLICY "Users can view own image metadata"
  ON image_metadata FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own image metadata"
  ON image_metadata FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own image metadata"
  ON image_metadata FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own image metadata"
  ON image_metadata FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ai_training_sessions
CREATE POLICY "Users can view own training sessions"
  ON ai_training_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training sessions"
  ON ai_training_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training sessions"
  ON ai_training_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training sessions"
  ON ai_training_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for model_deployments
CREATE POLICY "Users can view own deployments"
  ON model_deployments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deployments"
  ON model_deployments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployments"
  ON model_deployments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deployments"
  ON model_deployments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for plant_analyses
CREATE POLICY "Users can view own analyses"
  ON plant_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON plant_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON plant_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_image_metadata_user_id ON image_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_category ON image_metadata(category);
CREATE INDEX IF NOT EXISTS idx_ai_training_sessions_user_id ON ai_training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_sessions_status ON ai_training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_model_deployments_user_id ON model_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_analyses_user_id ON plant_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_analyses_created_at ON plant_analyses(created_at DESC);