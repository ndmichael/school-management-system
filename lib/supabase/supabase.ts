// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Supabase URL and Key from your Supabase project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);
