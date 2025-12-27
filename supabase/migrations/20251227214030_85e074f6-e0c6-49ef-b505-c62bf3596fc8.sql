-- Step 1: Add 'readonly' to the app_role enum
-- This needs to be committed before it can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'readonly';