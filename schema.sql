-- =========================================================================
-- Supabase Schema for Bipin Petroleum Co.
-- =========================================================================

-- =========================================================================
-- OPTION A: FRESH RE-CREATION (Highly recommended for fresh setups)
-- Warning: Un-comment the section below if you want to clear old tables first.
-- =========================================================================
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
-- DROP TRIGGER IF EXISTS set_users_updated_at ON public.users CASCADE;
-- DROP TRIGGER IF EXISTS set_settings_updated_at ON public.settings CASCADE;
-- DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies CASCADE;
-- DROP TRIGGER IF EXISTS set_products_updated_at ON public.products CASCADE;
-- DROP TRIGGER IF EXISTS set_sales_updated_at ON public.sales CASCADE;
-- DROP TRIGGER IF EXISTS set_purchase_updated_at ON public.purchase CASCADE;
-- DROP TABLE IF EXISTS public.purchase CASCADE;
-- DROP TABLE IF EXISTS public.sales CASCADE;
-- DROP TABLE IF EXISTS public.products CASCADE;
-- DROP TABLE IF EXISTS public.companies CASCADE;
-- DROP TABLE IF EXISTS public.settings CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;


-- ----------------------------------------------------
-- 1. Users Table (Profile linked to Supabase Auth)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    license_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure table has correct columns dynamically (for updates)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS license_id VARCHAR(255) UNIQUE;

-- Safely drop all foreign key constraints on the public.users table to allow pre-registered licenses
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND constraint_type = 'FOREIGN KEY'
    ) LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_record.constraint_name) || ';';
    END LOOP;
END;
$$;

-- Safe addition of unique email constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END;
$$;

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove old policies to prevent collision
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow public select for license and user match" ON public.users;
DROP POLICY IF EXISTS "Allow public insert for license registration" ON public.users;
DROP POLICY IF EXISTS "Allow public update for license registration" ON public.users;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow public select for license and user match" 
    ON public.users FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert for license registration" 
    ON public.users FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public update for license registration" 
    ON public.users FOR UPDATE 
    USING (true);


-- ----------------------------------------------------
-- Automatic syncing of new auth.users signup to public.users
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    has_existing BOOLEAN := FALSE;
    existing_license_id VARCHAR(255);
    existing_full_name VARCHAR(255);
    meta_license_id VARCHAR(255);
BEGIN
    -- Extract license_id from user metadata or fallback to a newly generated random license
    meta_license_id := COALESCE(
        new.raw_user_meta_data->>'license_id', 
        'LIC-' || upper(substring(gen_random_uuid()::text, 1, 4)) || '-' || upper(substring(gen_random_uuid()::text, 10, 4)) || '-' || upper(substring(gen_random_uuid()::text, 20, 4))
    );

    -- Check if a user with this email already exists (e.g. from pre-registered license purchase)
    SELECT TRUE, license_id, full_name INTO has_existing, existing_license_id, existing_full_name 
    FROM public.users WHERE email = new.email LIMIT 1;
    
    IF has_existing THEN
        -- Delete the pre-registered temporary record to avoid duplicate email or primary key mutation issues
        DELETE FROM public.users WHERE email = new.email;
        
        -- Insert fresh record linked to Supabase Auth ID, keeping the purchased license_id!
        INSERT INTO public.users (id, email, full_name, license_id)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', existing_full_name, 'Petroleum Operator'),
            COALESCE(existing_license_id, meta_license_id)
        );
    ELSE
        -- Fresh registration insert
        INSERT INTO public.users (id, email, full_name, license_id)
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', 'Petroleum Operator'),
            meta_license_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run handle_new_user on sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------
-- 2. Settings Table (Per user application configuration)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    company_name VARCHAR(255) DEFAULT 'Bipin Petroleum Co.',
    gstin VARCHAR(15),
    address TEXT,
    invoice_prefix VARCHAR(50) DEFAULT 'INV-',
    next_invoice_no INT DEFAULT 1,
    purchase_prefix VARCHAR(50) DEFAULT 'PUR-',
    next_purchase_no INT DEFAULT 1,
    default_gst_rate NUMERIC(5,2) DEFAULT 18.00,
    logo TEXT,
    phone VARCHAR(20) DEFAULT '+91 9981278197',
    email VARCHAR(255) DEFAULT 'dpravi799@gmail.com',
    website VARCHAR(255) DEFAULT 'www.stockregister.in',
    pan VARCHAR(10) DEFAULT 'AVHPC6971A',
    fssai VARCHAR(50) DEFAULT '24CMAPK3117Q1ZZ',
    bank_holder VARCHAR(255) DEFAULT 'Bipin Singh',
    bank_name VARCHAR(255) DEFAULT 'State Bank of India',
    bank_account VARCHAR(50) DEFAULT '38028101723',
    bank_branch VARCHAR(255) DEFAULT 'Surat Main',
    bank_ifsc VARCHAR(11) DEFAULT 'SBIN0002836',
    bank_upi VARCHAR(255) DEFAULT 'bipin@paytm',
    terms TEXT DEFAULT '1. Customer will pay the GST' || chr(10) || '2. Customer will pay the Delivery charges' || chr(10) || '3. Pay due amount within 15 days',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.settings;

-- RLS Policies for settings
CREATE POLICY "Users can manage their own settings" 
    ON public.settings FOR ALL 
    USING (auth.uid() = user_id);


-- ----------------------------------------------------
-- 3. Companies Table (Customers & Vendors info)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id VARCHAR(255) PRIMARY KEY, 
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('customer', 'vendor')),
    name VARCHAR(255) NOT NULL,
    gst VARCHAR(15),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    opening_balance NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_type ON public.companies(type);

-- Enable RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;

-- RLS Policies for companies
CREATE POLICY "Users can view their own companies" 
    ON public.companies FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own companies" 
    ON public.companies FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies" 
    ON public.companies FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies" 
    ON public.companies FOR DELETE 
    USING (auth.uid() = user_id);


-- ----------------------------------------------------
-- 4. Products Table (Stock Inventory Catalog)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(255) PRIMARY KEY, 
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hsn VARCHAR(20),
    unit VARCHAR(50) DEFAULT 'Pcs',
    quantity NUMERIC(12,2) DEFAULT 0.00,
    purchase_price NUMERIC(12,2) DEFAULT 0.00,
    selling_price NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

-- RLS Policies for products
CREATE POLICY "Users can view their own products" 
    ON public.products FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" 
    ON public.products FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
    ON public.products FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" 
    ON public.products FOR DELETE 
    USING (auth.uid() = user_id);


-- ----------------------------------------------------
-- 5. Sales Table (Sales Invoices with JSONB nested array for Items)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id VARCHAR(255) PRIMARY KEY, 
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    customer_id VARCHAR(255) REFERENCES public.companies(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_gst VARCHAR(15),
    customer_address TEXT,
    items JSONB NOT NULL, 
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    gst_amount NUMERIC(15,2) DEFAULT 0.00,
    discount NUMERIC(15,2) DEFAULT 0.00,
    round_off NUMERIC(15,2) DEFAULT 0.00,
    grand_total NUMERIC(15,2) DEFAULT 0.00,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- BACKWARD COMPATIBLE FIX FOR PILOT RE-RUNS:
-- If public.sales already layout has no customer_id, safely inject it:
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255) REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);

-- Enable RLS for sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

-- RLS Policies for sales
CREATE POLICY "Users can view their own sales" 
    ON public.sales FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales" 
    ON public.sales FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales" 
    ON public.sales FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales" 
    ON public.sales FOR DELETE 
    USING (auth.uid() = user_id);


-- ----------------------------------------------------
-- 6. Purchases Table (Purchase Bills inwards with JSONB)
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase (
    id VARCHAR(255) PRIMARY KEY, 
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bill_no VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    vendor_id VARCHAR(255) REFERENCES public.companies(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255),
    vendor_gst VARCHAR(15),
    vendor_address TEXT,
    items JSONB NOT NULL, 
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    gst_amount NUMERIC(15,2) DEFAULT 0.00,
    total NUMERIC(15,2) DEFAULT 0.00,
    previous_balance NUMERIC(15,2) DEFAULT 0.00,
    received_amount NUMERIC(15,2) DEFAULT 0.00,
    current_balance NUMERIC(15,2) DEFAULT 0.00,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- BACKWARD COMPATIBLE FIX FOR PILOT RE-RUNS:
-- If public.purchase already layout has no vendor_id, safely inject it:
ALTER TABLE public.purchase ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255) REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_user_id ON public.purchase(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_vendor_id ON public.purchase(vendor_id);

-- Enable RLS for purchase
ALTER TABLE public.purchase ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Users can view their own purchases" ON public.purchase;
DROP POLICY IF EXISTS "Users can insert their own purchases" ON public.purchase;
DROP POLICY IF EXISTS "Users can update their own purchases" ON public.purchase;
DROP POLICY IF EXISTS "Users can delete their own purchases" ON public.purchase;

-- RLS Policies for purchase
CREATE POLICY "Users can view their own purchases" 
    ON public.purchase FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" 
    ON public.purchase FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchases" 
    ON public.purchase FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchases" 
    ON public.purchase FOR DELETE 
    USING (auth.uid() = user_id);


-- ----------------------------------------------------
-- 7. Automated updated_at refresh trigger function
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
    new.updated_at = NOW();
    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_settings_updated_at ON public.settings;
CREATE TRIGGER set_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_sales_updated_at ON public.sales;
CREATE TRIGGER set_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_purchase_updated_at ON public.purchase;
CREATE TRIGGER set_purchase_updated_at
    BEFORE UPDATE ON public.purchase
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
