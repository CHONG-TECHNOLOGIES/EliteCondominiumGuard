
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nfuglaftnaohzacilike.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdWdsYWZ0bmFvaHphY2lsaWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIwMTY3MiwiZXhwIjoyMDc5Nzc3NjcyfQ.mn3VIXa1uni9LRrByDDfusSWo-d6m9QWL5ojxU0h0Ec';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

    if (error) {
        console.error('Error listing tables:', error);
        // Try another way if pg_tables is not accessible via REST
        console.log('Trying via SQL RPC if available...');
        const { data: data2, error: error2 } = await supabase.rpc('list_tables'); // Hypothetical RPC
        if (error2) {
            console.error('RPC failed too:', error2);
        } else {
            console.log('Tables:', data2);
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables();
