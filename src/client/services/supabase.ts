import { createClient } from '@supabase/supabase-js';

// Debug: Check what env vars are available
console.log('🔍 Checking Supabase env vars...');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present ✅' : 'Missing ❌');
console.log('All env vars:', import.meta.env);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('URL:', supabaseUrl);
    console.error('Key:', supabaseAnonKey ? 'present' : 'missing');
    throw new Error('Missing Supabase environment variables');
}

console.log('✅ Supabase client initialized');
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
