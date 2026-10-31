import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://slkmbmixdqczcjmmnnhc.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsa21ibWl4ZHFjemNqbW1ubmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NzEyOTIsImV4cCI6MjEwODI0NzI5Mn0.IcIUhnA7MZkyxpHHdijqFl_7lotEnbvSaajug0WAo_E';

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
