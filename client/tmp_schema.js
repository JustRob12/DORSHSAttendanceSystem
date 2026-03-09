require("dotenv").config({ path: "c:/Users/Asus/Documents/DORSHSAttendanceSystem/client/.env.local" });
require("dotenv").config({ path: "c:/Users/Asus/Documents/DORSHSAttendanceSystem/client/.env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in env.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_tables_and_columns_test_fake').catch(() => ({}));

    // Actually, we can just do a select on information_schema if enabled, but PostgREST usually blocks it for anon.
    // We can try fetching subject, student_subject mapping commonly named "enrollments", "student_subjects".

    const candidates = ["enrollments", "student_subjects", "enrolled_subjects", "subject_students", "classes", "student_classes"];
    for (const t of candidates) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (!error) {
            console.log(`✅ Table exists: ${t}`);
            if (data.length > 0) {
                console.log(`Sample data keys for ${t}:`, Object.keys(data[0]));
            } else {
                console.log(`Table ${t} is empty. (Checking column names via insert error)`);
                const { error: insErr } = await supabase.from(t).insert({ "test": "test" }).select();
                console.log(`Insert error hints columns: ${insErr?.message || "none"}`);
            }
        } else {
            console.log(`Table ${t} check error (might not exist): ${error.message}`);
        }
    }
}

checkSchema();
