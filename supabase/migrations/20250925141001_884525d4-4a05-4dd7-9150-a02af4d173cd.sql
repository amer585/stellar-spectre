-- Create table for model deployments
CREATE TABLE public.model_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  model_id TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'vision_transformer',
  accuracy DECIMAL(5,4) DEFAULT 0,
  f1_score DECIMAL(5,4) DEFAULT 0,
  deployment_status TEXT NOT NULL DEFAULT 'active' CHECK (deployment_status IN ('active', 'inactive', 'failed')),
  endpoint_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_deployments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own model deployments" 
ON public.model_deployments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own model deployments" 
ON public.model_deployments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own model deployments" 
ON public.model_deployments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own model deployments" 
ON public.model_deployments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_model_deployments_user_id ON public.model_deployments(user_id);
CREATE INDEX idx_model_deployments_status ON public.model_deployments(deployment_status);

-- Create trigger for timestamp updates
CREATE TRIGGER update_model_deployments_updated_at
BEFORE UPDATE ON public.model_deployments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();