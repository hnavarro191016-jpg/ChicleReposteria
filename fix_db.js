const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:xfcys5rkLNWbwC0F@db.huhqejasgephulhdaaja.supabase.co:5432/postgres'
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to Supabase DB");

    const sql = `
      CREATE TABLE IF NOT EXISTS public.business_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_name TEXT NOT NULL DEFAULT 'Chicle Repostería',
        currency TEXT NOT NULL DEFAULT 'MXN',
        tax_rate DECIMAL(5,2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      INSERT INTO public.business_settings (store_name)
      SELECT 'Chicle Repostería'
      WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'pending',
        full_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Enable all on settings" ON public.business_settings;
      CREATE POLICY "Enable all on settings" ON public.business_settings FOR ALL USING (true);

      DROP POLICY IF EXISTS "Enable all on profiles" ON public.profiles;
      CREATE POLICY "Enable all on profiles" ON public.profiles FOR ALL USING (true);

      CREATE OR REPLACE FUNCTION public.handle_new_user() 
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (new.id, new.raw_user_meta_data->>'full_name', 'pending');
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

      DELETE FROM auth.users WHERE email IN ('hnavarro191016@gmail.com', 'juan@prueba.com', 'hnavarro191015@gmail.com');
      
      UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'ceo@chicle.com');
    `;

    await client.query(sql);
    console.log("Database fixed successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
