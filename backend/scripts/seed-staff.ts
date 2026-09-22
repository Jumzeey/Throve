/**
 * Idempotent staff seed for the admin console.
 * Creates Auth users with passwords and sets profiles.admin_role.
 *
 * Usage (from backend/):
 *   npm run seed:staff
 *
 * Default password for all seeded staff (dev / staging only):
 *   ThroveAdmin!2026
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServiceClient } from '../src/lib/supabase.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const STAFF_PASSWORD = process.env.STAFF_SEED_PASSWORD?.trim() || 'ThroveAdmin!2026';

type StaffSeed = {
  email: string;
  name: string;
  username: string;
  role: 'super_admin' | 'trust_safety' | 'support' | 'finance';
};

const STAFF: StaffSeed[] = [
  {
    email: 'okafor@throve.store',
    name: 'M. Okafor',
    username: 'm.okafor',
    role: 'super_admin',
  },
  {
    email: 'safety@throve.store',
    name: 'F. Adeyemi',
    username: 'f.adeyemi',
    role: 'trust_safety',
  },
  {
    email: 'support@throve.store',
    name: 'S. Mensah',
    username: 's.mensah',
    role: 'support',
  },
  {
    email: 'finance@throve.store',
    name: 'I. Danjuma',
    username: 'i.danjuma',
    role: 'finance',
  },
];

async function ensureStaff(admin: ReturnType<typeof createServiceClient>, staff: StaffSeed) {
  const email = staff.email.toLowerCase();
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw listed.error;

  let userId = listed.data.users.find((u) => (u.email ?? '').toLowerCase() === email)?.id;

  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email,
      password: STAFF_PASSWORD,
      email_confirm: true,
      user_metadata: { name: staff.name, username: staff.username },
    });
    if (created.error) throw new Error(`${email}: ${created.error.message}`);
    userId = created.data.user.id;
    console.log(`created auth user ${email}`);
  } else {
    const updated = await admin.auth.admin.updateUserById(userId, {
      password: STAFF_PASSWORD,
      email_confirm: true,
      user_metadata: { name: staff.name, username: staff.username },
    });
    if (updated.error) throw new Error(`${email}: ${updated.error.message}`);
    console.log(`updated auth user ${email}`);
  }

  const { data: existing } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (!existing) {
    const { error } = await admin.from('profiles').insert({
      id: userId,
      email,
      name: staff.name,
      username: staff.username,
      bio: '',
      location: '',
      setup_complete: true,
      can_host_live: false,
      admin_role: staff.role,
      admin_active: true,
    });
    if (error) throw new Error(`${email} profile insert: ${error.message}`);
  } else {
    const { error } = await admin
      .from('profiles')
      .update({
        email,
        name: staff.name,
        username: staff.username,
        setup_complete: true,
        admin_role: staff.role,
        admin_active: true,
      })
      .eq('id', userId);
    if (error) throw new Error(`${email} profile update: ${error.message}`);
  }

  console.log(`  → ${staff.role}`);
}

async function main() {
  const admin = createServiceClient();
  console.log('Seeding staff console accounts…');
  for (const staff of STAFF) {
    await ensureStaff(admin, staff);
  }
  console.log('\nStaff credentials (dev/staging):');
  for (const staff of STAFF) {
    console.log(`  ${staff.role.padEnd(14)}  ${staff.email}  /  ${STAFF_PASSWORD}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
