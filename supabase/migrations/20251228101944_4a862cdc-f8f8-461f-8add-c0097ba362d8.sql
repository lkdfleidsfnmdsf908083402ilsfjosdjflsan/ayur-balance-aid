-- Create invitations table for token-based onboarding
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'mitarbeiter',
  abteilung TEXT,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins can view invitations" 
ON public.invitations 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invitations" 
ON public.invitations 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitations" 
ON public.invitations 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitations" 
ON public.invitations 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Public can read unused invitations by token (for registration page)
CREATE POLICY "Anyone can read invitation by token" 
ON public.invitations 
FOR SELECT 
USING (used_at IS NULL AND expires_at > now());

-- Index for fast token lookup
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);