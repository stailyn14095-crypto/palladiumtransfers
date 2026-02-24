// Delete invalid emails script
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Make sure they are in .env.local");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function removeInvalidEmails() {
    const emailsToRemove = ['verifier@palladium.com', 'admin@palladium.com'];

    for (const email of emailsToRemove) {
        console.log(`\nProcessing ${email}...`);

        // 1. Find user in auth.users by email to get their ID
        // Note: admin.listUsers requires the service_role key
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            console.error("Error listing auth users:", listError);
            return;
        }

        const authUser = usersData.users.find(u => u.email === email);

        if (!authUser) {
            console.log(`User ${email} not found in Supabase Auth. Checking public.users...`);
        } else {
            console.log(`Found Auth User for ${email} with ID: ${authUser.id}. Proceeding to delete...`);

            // 2. Delete the user from auth.users
            // Given referential integrity, this will also delete from public.users ifON DELETE CASCADE is set
            const { data: delData, error: delError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);

            if (delError) {
                console.error(`Error deleting Auth user ${email}:`, delError);
            } else {
                console.log(`Successfully deleted ${email} from Supabase Auth.`);
            }
        }

        // 3. Fallback: manually attempt to delete from public.users just in case they exist there without an Auth record
        console.log(`Attempting to clean up any straggler records for ${email} in public.users...`);
        const { error: publicDelError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('email', email);

        if (publicDelError) {
            console.error(`Error deleting ${email} from public.users:`, publicDelError);
        } else {
            console.log(`Ensured no records for ${email} exist in public.users.`);
        }
    }

    console.log("\nCleanup finished.");
}

removeInvalidEmails();
