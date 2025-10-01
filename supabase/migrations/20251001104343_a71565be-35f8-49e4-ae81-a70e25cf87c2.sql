-- Fix 1: Create security definer function to check admin role (prevents RLS infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Fix 2: Drop old recursive admin policy on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Fix 3: Create new non-recursive admin policy using security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Fix 4: Update admin update policy to use security definer function
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Fix 5: Remove overly permissive system policy on dataset_images
DROP POLICY IF EXISTS "System can manage all images" ON public.dataset_images;

-- Fix 6: Add proper granular policies for dataset_images
CREATE POLICY "Users can insert images to their collections" 
ON public.dataset_images 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM dataset_collections
    WHERE dataset_collections.id = dataset_images.collection_id
      AND dataset_collections.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update images in their collections" 
ON public.dataset_images 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM dataset_collections
    WHERE dataset_collections.id = dataset_images.collection_id
      AND dataset_collections.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete images from their collections" 
ON public.dataset_images 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM dataset_collections
    WHERE dataset_collections.id = dataset_images.collection_id
      AND dataset_collections.user_id = auth.uid()
  )
);