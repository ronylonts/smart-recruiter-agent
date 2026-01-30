# Notes de migration de base de données

## Nouveau champ requis pour AutoSendToggle

### Table : `users`

**Nouveau champ à ajouter :**

```sql
ALTER TABLE users 
ADD COLUMN auto_send_enabled BOOLEAN DEFAULT FALSE;
```

**Détails :**
- **Nom** : `auto_send_enabled`
- **Type** : `BOOLEAN`
- **Défaut** : `FALSE`
- **Nullable** : Non (NOT NULL par défaut avec DEFAULT)
- **Description** : Active/désactive l'envoi automatique de candidatures pour l'utilisateur

### Comment appliquer la migration dans Supabase :

1. Aller dans votre projet Supabase
2. Ouvrir l'éditeur SQL
3. Exécuter la requête suivante :

```sql
ALTER TABLE users 
ADD COLUMN auto_send_enabled BOOLEAN DEFAULT FALSE;
```

4. Vérifier que la colonne a été ajoutée :

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'auto_send_enabled';
```

### Utilisation dans le code :

Le composant `AutoSendToggle` utilise ce champ pour :
- **Lire** l'état actuel lors du chargement
- **Écrire** le nouveau statut lors du toggle
- **Afficher** un toast de confirmation

```typescript
// Lecture
const { data } = await supabase
  .from('users')
  .select('auto_send_enabled')
  .eq('id', user.id)
  .single();

// Écriture
await supabase
  .from('users')
  .update({ auto_send_enabled: true })
  .eq('id', user.id);
```

### Valeurs par défaut :

- **Nouveaux utilisateurs** : `FALSE` (désactivé par défaut)
- **Utilisateurs existants** : `FALSE` (après migration)

### Sécurité :

Assurez-vous que les Row Level Security (RLS) policies permettent :
- Aux utilisateurs de **lire** leur propre `auto_send_enabled`
- Aux utilisateurs de **mettre à jour** leur propre `auto_send_enabled`

**Exemple de policy :**

```sql
-- Lecture
CREATE POLICY "Users can read own auto_send_enabled"
ON users FOR SELECT
USING (auth.uid() = id);

-- Mise à jour
CREATE POLICY "Users can update own auto_send_enabled"
ON users FOR UPDATE
USING (auth.uid() = id);
```

### Vérification :

Après migration, testez :

1. **Lecture initiale** : Le toggle doit être en position "Désactivé" par défaut
2. **Activation** : Cliquer sur le toggle doit l'activer et afficher un toast vert
3. **Désactivation** : Re-cliquer doit le désactiver et afficher un toast gris
4. **Persistance** : Recharger la page doit conserver l'état

### Schema TypeScript mis à jour :

Le type `User` dans `database.types.ts` doit inclure :

```typescript
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  profession: string | null;
  city: string | null;
  country: string | null;
  auto_send_enabled: boolean; // ← Nouveau champ
  created_at: string;
}
```

---

**Date de création** : 2026-01-29  
**Composant associé** : `src/components/AutoSendToggle.tsx`
