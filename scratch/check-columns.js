const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns in profiles:', Object.keys(data[0] || {}));
  }
  
  const { data: payData, error: payError } = await supabase.from('payments').select('*').limit(1);
  if (payError) {
    console.error('Error payments:', payError);
  } else {
    console.log('Columns in payments:', Object.keys(payData[0] || {}));
  }
}

run();
