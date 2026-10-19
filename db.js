import { createRequire } from 'module';
import { createClient as createClientESM } from '@supabase/supabase-js';

// CommonJS and ES Module compatible require
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Example query helper for Supabase table (replace 'bookings' with your table name)
export async function getTableData(tableName = 'bookings') {
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Supabase query error on ${tableName}:`, err);
    return null;
  }
}

export { createClient };
export default supabase;
