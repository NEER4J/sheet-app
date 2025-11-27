-- Create saved_sheets table to store Google Sheets data as JSON
CREATE TABLE IF NOT EXISTS public.saved_sheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sheet_name TEXT NOT NULL,
    spreadsheet_id TEXT NOT NULL,
    tab_name TEXT NOT NULL,
    data_json JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_sheets_user_id ON public.saved_sheets(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_saved_sheets_created_at ON public.saved_sheets(created_at DESC);


-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_sheets_updated_at
    BEFORE UPDATE ON public.saved_sheets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
