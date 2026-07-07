const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('get_my_claims'); // Just checking if get_my_claims or any RPC works
  console.log('get_my_claims:', { data, error });

  // Let's run a query to check if there are any custom RPC functions
  const { data: functions, error: funcError } = await supabase.from('profiles').select('id').limit(1);
  console.log('profiles status:', { data: functions, error: funcError });
}

run();
