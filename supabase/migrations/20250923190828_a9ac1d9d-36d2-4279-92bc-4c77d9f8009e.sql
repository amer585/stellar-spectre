-- Create the transit analyses table for storing analysis results
CREATE TABLE public.transit_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  analysis_result JSONB,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transit_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own analyses" 
ON public.transit_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" 
ON public.transit_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" 
ON public.transit_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" 
ON public.transit_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transit_analyses_updated_at
BEFORE UPDATE ON public.transit_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for light curve files
INSERT INTO storage.buckets (id, name, public) VALUES ('light-curves', 'light-curves', false);

-- Create storage policies for light curve uploads
CREATE POLICY "Users can view their own light curve files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'light-curves' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own light curve files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'light-curves' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own light curve files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'light-curves' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own light curve files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'light-curves' AND auth.uid()::text = (storage.foldername(name))[1]);