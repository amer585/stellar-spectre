-- Add password reset and admin approval functionality
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_registration_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password_reset_tokens
CREATE POLICY "Users can view their own reset tokens" 
ON public.password_reset_tokens 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can create reset tokens" 
ON public.password_reset_tokens 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own reset tokens" 
ON public.password_reset_tokens 
FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for user_registration_requests
CREATE POLICY "Anyone can create registration requests" 
ON public.user_registration_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all registration requests" 
ON public.user_registration_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update registration requests" 
ON public.user_registration_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() AND p2.role = 'admin'
  )
);

CREATE POLICY "System can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() AND p2.role = 'admin'
  )
);

-- Create admin user profile
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT id, email, 'System Admin', 'admin'
FROM auth.users 
WHERE email = 'ameremadapdelkalek@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Function to handle new user creation with approval
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Check if user registration was pre-approved
  IF EXISTS (
    SELECT 1 FROM public.user_registration_requests 
    WHERE email = NEW.email AND status = 'approved'
  ) THEN
    -- Create profile for approved user
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
      NEW.id, 
      NEW.email, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      CASE 
        WHEN NEW.email = 'ameremadapdelkalek@gmail.com' THEN 'admin'
        ELSE 'user'
      END
    );
    
    -- Mark registration request as processed
    UPDATE public.user_registration_requests 
    SET status = 'approved', approved_at = now()
    WHERE email = NEW.email;
  ELSE
    -- Create registration request for new user
    INSERT INTO public.user_registration_requests (email, full_name, status)
    VALUES (
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
      CASE 
        WHEN NEW.email = 'ameremadapdelkalek@gmail.com' THEN 'approved'
        ELSE 'pending'
      END
    ) ON CONFLICT (email) DO NOTHING;
    
    -- If admin, create profile immediately
    IF NEW.email = 'ameremadapdelkalek@gmail.com' THEN
      INSERT INTO public.profiles (user_id, email, full_name, role)
      VALUES (NEW.id, NEW.email, 'System Admin', 'admin')
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();