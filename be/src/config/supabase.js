const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

// Client ini memakai service role key, yang MELEWATI Row Level Security.
// Hanya boleh dipakai di backend ini. Jangan pernah dikirim ke frontend.
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

module.exports = supabase;