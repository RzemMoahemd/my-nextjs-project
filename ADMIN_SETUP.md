# Configuration de l'espace Administrateur

## Comment créer un compte administrateur pour votre boutique ELEGANCE

### Étape 1 : Créer un utilisateur dans Supabase Auth

1. Allez sur votre [tableau de bord Supabase](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans l'onglet **Authentication** (dans le menu de gauche)
4. Cliquez sur l'onglet **Users**
5. Cliquez sur le bouton **"Add user"**
6. Remplissez les champs :
   - **Email** : votre email administrateur (ex: admin@elegance.com)
   - **Password** : un mot de passe fort et sécurisé
7. Cliquez sur **"Create user"**

### Étape 2 : Récupérer l'ID de l'utilisateur

1. Après création, vous verrez l'utilisateur dans la liste
2. Cliquez sur l'utilisateur pour voir son profil
3. Copiez l'**ID** (UUID) affiché en haut (exemple: `550e8400-e29b-41d4-a716-446655440000`)

### Étape 3 : Ajouter l'utilisateur à la table admin_users

1. Dans Supabase, allez dans l'onglet **SQL Editor**
2. Copiez-collez la requête suivante en **remplaçant** `YOUR_USER_ID` par l'ID copié à l'étape précédente :

\`\`\`sql
INSERT INTO admin_users (id, email, role) 
VALUES ('YOUR_USER_ID', 'admin@elegance.com', 'admin');
\`\`\`

**Exemple complet** :
\`\`\`sql
INSERT INTO admin_users (id, email, role) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin@elegance.com', 'admin');
\`\`\`

3. Cliquez sur le bouton **"Run"** ou appuyez sur **Ctrl+Enter**

### Étape 4 : Accéder à l'espace admin

1. Allez sur `https://votresite.com/admin/login` (ou `http://localhost:3000/admin/login` en développement)
2. Connectez-vous avec :
   - **Email** : admin@elegance.com
   - **Mot de passe** : le mot de passe que vous avez défini
3. Vous êtes maintenant administrateur !

## Fonctionnalités de l'admin

Une fois connecté, vous pouvez :

- **Voir le dashboard** avec les statistiques :
  - Total de produits
  - Produits en stock
  - Produits en rupture
  
- **Ajouter des produits** : Cliquez sur "Ajouter un produit" pour créer un nouveau produit
  
- **Modifier les produits** : Cliquez sur "Modifier" pour éditer un produit existant
  
- **Supprimer les produits** : Cliquez sur "Supprimer" pour retirer un produit

- **Gérer les images** : Les images sont stockées dans Supabase Storage

## Dépannage

### Je reçois "Accès refusé. Vous n'êtes pas administrateur."

**Solution** : L'utilisateur existe dans Supabase Auth mais n'a pas été ajouté à la table `admin_users`. Suivez l'Étape 3 ci-dessus.

### Je ne vois pas l'utilisateur dans la liste

**Solution** : Vérifiez que vous êtes bien connecté à votre projet Supabase et que vous êtes dans l'onglet Authentication > Users.

### Je veux créer un autre administrateur

**Étapes** :
1. Créez un nouvel utilisateur dans Supabase (Étape 1-2)
2. Insérez-le dans `admin_users` avec la même requête SQL (Étape 3) avec son nouvel ID et email

## Sécurité

- Ne partagez jamais vos identifiants admin avec d'autres personnes
- Utilisez un mot de passe fort (minimum 12 caractères avec majuscules, minuscules, chiffres et caractères spéciaux)
- Changez régulièrement votre mot de passe Supabase
