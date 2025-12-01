import { createClient } from '@supabase/supabase-js';

// Credenciais de Produção fornecidas pelo utilizador
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nfuglaftnaohzacilike.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdWdsYWZ0bmFvaHphY2lsaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDE2NzIsImV4cCI6MjA3OTc3NzY3Mn0.yNzC4pMn5UBn_H8H0A4qbex1N5AeKWfwtuUcbahXpF0';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      auth: {
        persistSession: false
      }
    })
  : null;

console.log('[SupabaseClient] Supabase client initialized with realtime enabled');