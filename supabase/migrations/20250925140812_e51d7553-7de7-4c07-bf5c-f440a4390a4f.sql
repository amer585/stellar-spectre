-- Create table for image metadata
CREATE TABLE public.image_metadata (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('planet', 'moon', 'star', 'galaxy', 'nebula', 'other')),
  file_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own image metadata" 
ON public.image_metadata 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own image metadata" 
ON public.image_metadata 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image metadata" 
ON public.image_metadata 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image metadata" 
ON public.image_metadata 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_image_metadata_user_id ON public.image_metadata(user_id);
CREATE INDEX idx_image_metadata_category ON public.image_metadata(category);
CREATE INDEX idx_image_metadata_source ON public.image_metadata(source);

-- Create trigger for timestamp updates
CREATE TRIGGER update_image_metadata_updated_at
BEFORE UPDATE ON public.image_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for training datasets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('training-datasets', 'training-datasets', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for training datasets
CREATE POLICY "Users can view their own training images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'training-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own training images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'training-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own training images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'training-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own training images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'training-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);