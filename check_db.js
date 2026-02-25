const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://gehqxdzlqcfxmhlaseeb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHF4ZHpscWNmeG1obGFzZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTUyMzgsImV4cCI6MjA4NTA5MTIzOH0.qKfxPMOFakbCuOSmFkPAlR6LovVRT-IO2cRk5bR3tUY';
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
