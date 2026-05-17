-- SQL Migration: Client Authentication & Customer Portal Foundation

-- 1. Create a sequence for customer numbers starting at 10001
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 10001;

-- 2. Update or Create customers table
-- Using UUID for compatibility with Supabase Auth
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    customer_number TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    preferred_language TEXT DEFAULT 'nl',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Function to generate customer number
CREATE OR REPLACE FUNCTION public.generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_number IS NULL THEN
        NEW.customer_number := 'CUST-' || nextval('customer_number_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to generate customer number before insert
DROP TRIGGER IF EXISTS trigger_generate_customer_number ON public.customers;
CREATE TRIGGER trigger_generate_customer_number
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.generate_customer_number();

-- 5. Function to handle new user registration from Supabase Auth
-- This automatically creates a customer profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, email, full_name, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'nl')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to sync auth.users with public.customers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Ensure bookings table has the necessary columns for linkage
-- We keep id as TEXT to not break existing booking core architecture
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
-- Optionally we can also link via email if UUID is not available (for guest transition)
-- but user_id is the primary ownership link.

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for Customers
DROP POLICY IF EXISTS "Customers can view their own profile" ON public.customers;
CREATE POLICY "Customers can view their own profile"
ON public.customers FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Customers can update their own profile" ON public.customers;
CREATE POLICY "Customers can update their own profile"
ON public.customers FOR UPDATE
USING (auth.uid() = id);

-- 10. RLS Policies for Bookings
DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customers can view their own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = email);

DROP POLICY IF EXISTS "Customers can insert their own bookings" ON public.bookings;
CREATE POLICY "Customers can insert their own bookings"
ON public.bookings FOR INSERT
WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND user_id IS NULL)
);

-- 11. Allow AI Chat (service role) to manage bookings
-- (This is usually handled by service_role key which bypasses RLS,
-- but good to keep in mind if using a restricted API user)
