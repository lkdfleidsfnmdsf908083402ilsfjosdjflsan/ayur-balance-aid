-- Create a helper function to check if user is readonly
CREATE OR REPLACE FUNCTION public.is_readonly(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'readonly'
  )
$$;

-- Update profiles RLS to allow readonly users to view all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  (id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'readonly'::app_role)
);

-- Update user_roles RLS to allow readonly users to view roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins and readonly can view roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'readonly'::app_role)
  OR (user_id = auth.uid())
);