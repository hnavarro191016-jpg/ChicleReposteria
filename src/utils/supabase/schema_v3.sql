-- Tabla: business_settings
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'Chicle Repostería',
  currency TEXT NOT NULL DEFAULT 'MXN',
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar configuración inicial (solo si no existe)
INSERT INTO public.business_settings (store_name)
SELECT 'Chicle Repostería'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- Tabla: profiles (para extender auth.users con roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin' o 'staff'
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas temporales (permisivas para facilitar el desarrollo)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all on settings" ON public.business_settings;
CREATE POLICY "Enable all on settings" ON public.business_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all on profiles" ON public.profiles;
CREATE POLICY "Enable all on profiles" ON public.profiles FOR ALL USING (true);

-- Trigger para insertar en profiles cuando se crea un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'staff');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Sincronizar usuarios existentes (¡Todos los actuales serán ADMIN porque eres tú!)
INSERT INTO public.profiles (id, role)
SELECT id, 'admin' FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
