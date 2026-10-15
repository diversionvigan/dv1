const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Example query helper for Supabase table
async function getTableData(tableName = 'bookings') {
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Supabase query error on ${tableName}:`, err);
    return null;
  }
}

module.exports = { supabase, createClient, getTableData };
