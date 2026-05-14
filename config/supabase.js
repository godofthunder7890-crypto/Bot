const { createClient } = require('@supabase/supabase-js');
const { config } = require('./index');

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey);
  }
  return supabaseClient;
}

module.exports = { getSupabase };
