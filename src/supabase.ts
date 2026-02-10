import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hqaiuywzklrwywdhmqxw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYWl1eXd6a2xyd3l3ZGhtcXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjI1ODksImV4cCI6MjA4MjU5ODU4OX0.H5lttp_1C0G9DwR8bk9mg-VgvdaOKubyH82Jn8MsgxY';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 10 &&
  SUPABASE_ANON_KEY.length > 10 &&
  !SUPABASE_URL.includes('placeholder');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
