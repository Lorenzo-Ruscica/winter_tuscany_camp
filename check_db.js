const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qdzktcgtxowsmrdfxegk.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemt0Y2d0eG93c21yZGZ4ZWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDg5NDUsImV4cCI6MjA4NzYyNDk0NX0.ZkBGhsmNIZpfTgfWOV2wYKzAZq6URnOTGPf_Htay4Mk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase.from('bookings').select('*, is_paid').limit(1);
    if(error){
        console.log("No is_paid column:", error.message);
    } else {
        console.log("is_paid column exists:", data);
    }
}
check();
