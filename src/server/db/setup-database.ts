import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

/**
 * Complete database setup: triggers + RLS policies
 * Runs automatically after migrations
 */
export async function setupDatabase() {
  console.log('⚙️  Setting up database (triggers + RLS)...\n');

  try {
    // ============================================
    // 1. CREATE TRIGGER: Sync auth.users to public.users AFTER EMAIL VERIFICATION
    // ============================================
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION public.handle_user_email_verified() 
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only insert if email is confirmed
        IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
          INSERT INTO public.users (id, email, full_name, created_at, updated_at)
          VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'full_name',
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            updated_at = NOW();
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await sql.unsafe(`
      DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
      CREATE TRIGGER on_auth_user_email_verified
        AFTER UPDATE ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_user_email_verified();
    `);

    console.log('✅ User sync trigger created');

    // ============================================
    // 2. ENABLE RLS ON ALL TABLES
    // ============================================
    await sql.unsafe(`
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
    `);

    console.log('✅ RLS enabled on all tables');

    // ============================================
    // 3. CREATE RLS POLICIES
    // ============================================

    // Users table
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Users can read own record" ON public.users;
      CREATE POLICY "Users can read own record"
        ON public.users FOR SELECT
        USING (auth.uid() = id);

      DROP POLICY IF EXISTS "Users can update own record" ON public.users;
      CREATE POLICY "Users can update own record"
        ON public.users FOR UPDATE
        USING (auth.uid() = id);
    `);

    // WhatsApp Sessions
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Users can manage own sessions" ON public.whatsapp_sessions;
      CREATE POLICY "Users can manage own sessions"
        ON public.whatsapp_sessions FOR ALL
        USING (auth.uid() = user_id);
    `);

    // Knowledge Items
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Users can manage own knowledge" ON public.knowledge_items;
      CREATE POLICY "Users can manage own knowledge"
        ON public.knowledge_items FOR ALL
        USING (auth.uid() = user_id);
    `);

    // Agents
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Users can manage own agents" ON public.agents;
      CREATE POLICY "Users can manage own agents"
        ON public.agents FOR ALL
        USING (auth.uid() = user_id);
    `);

    // Conversations
    await sql.unsafe(`
      DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
      CREATE POLICY "Users can manage own conversations"
        ON public.conversations FOR ALL
        USING (auth.uid() = user_id);
    `);

    console.log('✅ RLS policies created\n');
    console.log('🎉 Database setup complete!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
