-- ================================================================================================
--
--                            MASTER DATABASE FIX SCRIPT
--
-- ================================================================================================
-- This is the only script you need to run to fix the user signup issue.
-- It will completely reset your database's security policies and signup logic.
--
-- Instructions:
-- 1. Go to the SQL Editor in your Supabase project.
-- 2. Paste the ENTIRE contents of this file into the editor.
-- 3. Click "Run".
--
-- ================================================================================================

BEGIN;

-- ================================================================================================
-- STEP 1: AGGRESSIVE CLEANUP
-- ================================================================================================
-- Drop the trigger and function to ensure they can be recreated cleanly.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_delete_user();

-- Drop all known RLS policies from all tables to ensure a clean slate.
DROP POLICY IF EXISTS "Allow profile creation for new users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

DROP POLICY IF EXISTS "Users can manage their own data" ON public.videos;
DROP POLICY IF EXISTS "Users can manage their own data" ON public.playlists;
DROP POLICY IF EXISTS "Users can manage their own data" ON public.notes;
DROP POLICY IF EXISTS "Users can manage their own data" ON public.tags;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can manage their playlist videos" ON public.playlist_videos;
DROP POLICY IF EXISTS "Users can manage their note tags" ON public.note_tags;
DROP POLICY IF EXISTS "Users can manage their own shared links" ON public.shared_links;
DROP POLICY IF EXISTS "Allow public read access to shared links" ON public.shared_links;
DROP POLICY IF EXISTS "Users can manage views on their own shared links" ON public.shared_link_views;
DROP POLICY IF EXISTS "Allow public read access to comments" ON public.comments;
DROP POLICY IF EXISTS "Users can manage comments on their own shared links" ON public.comments;


-- ================================================================================================
-- STEP 2: RECREATE SIGNUP LOGIC
-- ================================================================================================
-- Recreate the function that creates a user profile when a new user signs up.
-- The SECURITY DEFINER clause is essential for it to work correctly.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger on the authentication table.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================================================
-- STEP 3: ADD ACCOUNT DELETION LOGIC
-- ================================================================================================
CREATE OR REPLACE FUNCTION handle_delete_user()
RETURNS void AS $$
BEGIN
  -- Delete all user data from public tables
  DELETE FROM public.notes WHERE user_id = auth.uid();
  DELETE FROM public.videos WHERE user_id = auth.uid();
  DELETE FROM public.playlists WHERE user_id = auth.uid();
  DELETE FROM public.tags WHERE user_id = auth.uid();
  DELETE FROM public.user_activity WHERE user_id = auth.uid();
  DELETE FROM public.shared_links WHERE user_id = auth.uid();

  -- Finally, delete the user profile
  DELETE FROM public.user_profiles WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================================================
-- STEP 4: ESTABLISH CORRECT SECURITY POLICIES
-- ================================================================================================
-- Enable Row Level Security on all tables.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_link_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Create the definitive policies for the user_profiles table.
-- THIS IS THE MOST IMPORTANT POLICY FOR FIXING SIGNUP. It allows the trigger to work.
CREATE POLICY "Allow profile creation for new users"
ON public.user_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own profile"
ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

-- Create placeholder "user can do everything" policies for other tables.
-- You can make these more restrictive later if needed.
CREATE POLICY "Users can manage their own data" ON public.videos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.playlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own data" ON public.tags FOR ALL USING (auth.uid() = user_id);

COMMIT;

-- ================================================================================================
-- END OF SCRIPT
-- ================================================================================================ 