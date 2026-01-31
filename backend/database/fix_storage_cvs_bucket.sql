-- Script SQL pour configurer les policies du Storage Bucket "cvs"
-- À exécuter dans l'éditeur SQL de Supabase

-- ATTENTION : Les policies de Storage sont dans storage.objects, pas dans public

-- Vérifier les policies existantes du bucket cvs
SELECT * FROM storage.policies WHERE bucket_id = 'cvs';

-- Supprimer toutes les anciennes policies du bucket cvs
DELETE FROM storage.policies WHERE bucket_id = 'cvs';

-- Policy 1 : Permettre à TOUS (authenticated + anon) d'uploader dans le bucket cvs
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Allow all uploads to cvs bucket',
  'cvs',
  'INSERT',
  'true'
);

-- Policy 2 : Permettre à TOUS de lire depuis le bucket cvs
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Allow all reads from cvs bucket',
  'cvs',
  'SELECT',
  'true'
);

-- Policy 3 : Permettre aux utilisateurs authentifiés de supprimer leurs fichiers
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Allow authenticated users to delete their files',
  'cvs',
  'DELETE',
  '(storage.foldername(name))[1] = auth.uid()::text'
);

-- Policy 4 : Permettre aux utilisateurs authentifiés de mettre à jour leurs fichiers
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Allow authenticated users to update their files',
  'cvs',
  'UPDATE',
  '(storage.foldername(name))[1] = auth.uid()::text'
);

-- Vérifier que les policies sont bien créées
SELECT * FROM storage.policies WHERE bucket_id = 'cvs';
