const fs = require('fs');
const env = fs.readFileSync('c:/Users/Asus/Documents/DORSHSAttendanceSystem/client/.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

async function check() {
    const tables = ['enrolled_subjects', 'student_subjects', 'student_subject', 'enrollments'];
    for (const t of tables) {
        const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        if (res.ok) {
            console.log(`✅ FOUND TABLE: ${t}`);
            const data = await res.json();
            if (data.length > 0) console.log(Object.keys(data[0]));
            break;
        } else {
            console.log(`❌ ${t}: ${res.statusText}`);
        }
    }
}
check();
