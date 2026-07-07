const { createAdminClient } = require('../lib/supabase/admin');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testInsert() {
  const admin = createAdminClient();
  const testId = '00000000-0000-0000-0000-000000000000';
  
  // Clean up if exists
  await admin.from('profiles').delete().eq('id', testId);
  
  const insertData = {
    id: testId,
    email: 'test-insert@example.com',
    profile_type: 'alumni',
    full_name: 'Test User',
    batch_year: 2020,
    course: 'Secondary (10th)',
    education_level: 'secondary',
    passing_year: 2020,
    current_country: 'India',
    hide_email: false,
    hide_phone: false,
    role: 'pending',
    approval_status: 'pending',
    website_url: 'https://example.com/doc.jpg'
  };
  
  console.log('Attempting insert with data:', insertData);
  const { data, error } = await admin.from('profiles').insert(insertData).select();
  
  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert succeeded! Created profile:', data);
    // Clean up
    await admin.from('profiles').delete().eq('id', testId);
  }
}

testInsert().catch(console.error);
