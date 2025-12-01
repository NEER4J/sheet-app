-- Create google_tokens table to store OAuth tokens persistently
CREATE TABLE IF NOT EXISTS public.google_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    provider_token TEXT NOT NULL,
    provider_refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON public.google_tokens(user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_google_tokens_updated_at
    BEFORE UPDATE ON public.google_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
