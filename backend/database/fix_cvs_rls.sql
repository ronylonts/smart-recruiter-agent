-- OPTION 1 : Désactiver temporairement RLS pour tester
-- (À utiliser UNIQUEMENT pour le développement/test)
ALTER TABLE public.cvs DISABLE ROW LEVEL SECURITY;

-- OPTION 2 : Ajouter des policies complètes
-- (À utiliser en production)

-- D'abord, supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can insert their own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Users can view their own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Users can update their own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Users can delete their own CVs" ON public.cvs;
DROP POLICY IF EXISTS "Backend can read CVs" ON public.cvs;

-- Réactiver RLS
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

-- Policy 1 : Les utilisateurs authentifiés peuvent insérer leurs propres CVs
CREATE POLICY "Users can insert their own CVs"
ON public.cvs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2 : Les utilisateurs authentifiés peuvent voir leurs propres CVs
CREATE POLICY "Users can view their own CVs"
ON public.cvs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3 : Les utilisateurs authentifiés peuvent mettre à jour leurs propres CVs
CREATE POLICY "Users can update their own CVs"
ON public.cvs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4 : Les utilisateurs authentifiés peuvent supprimer leurs propres CVs
CREATE POLICY "Users can delete their own CVs"
ON public.cvs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy 5 : Le backend (anon key) peut lire TOUS les CVs
CREATE POLICY "Backend can read all CVs"
ON public.cvs
FOR SELECT
TO anon
USING (true);

-- Policy 6 : Le backend (service_role) peut tout faire
CREATE POLICY "Service role can manage CVs"
ON public.cvs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Vérifier les policies créées
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'cvs';
