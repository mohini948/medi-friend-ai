-- Allow users to insert their own role during signup
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also update the doctors table to allow doctors to insert their own profile during signup
DROP POLICY IF EXISTS "Doctors can insert their own profile" ON public.doctors;

CREATE POLICY "Doctors can insert their own profile"
ON public.doctors
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);