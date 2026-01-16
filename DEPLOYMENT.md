# 🚀 Guide de Déploiement : Plateforme FNCT 2026

Suivez ces étapes pour déployer la plateforme gratuitement en moins de 15 minutes.

## 1. Base de Données & Backend (Supabase)
1. Créez un compte sur [Supabase.com](https://supabase.com/).
2. Créez un nouveau projet "FNCT-Hackathon".
3. Allez dans le **SQL Editor** et collez le contenu du fichier `schema.sql`.
4. Allez dans **Authentication > Providers** et activez "Email/Password".
5. Allez dans **Storage**, créez deux buckets publics : `cv-candidates` et `project-files`.
6. Récupérez vos clés dans **Settings > API** :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 2. Hébergement Frontend (Vercel)
1. Poussez votre code sur un dépôt **GitHub** (Privé ou Public).
2. Connectez-vous sur [Vercel.com](https://vercel.com/) avec votre compte GitHub.
3. Importez le dépôt du projet.
4. Dans **Environment Variables**, ajoutez :
   - `REACT_APP_SUPABASE_URL` = (votre URL Supabase)
   - `REACT_APP_SUPABASE_ANON_KEY` = (votre clé Anon)
5. Cliquez sur **Deploy**.

## 3. Configuration Post-Déploiement
- **DNS** : Vercel vous fournira une URL `.vercel.app`. Vous pouvez lier un sous-domaine comme `hackathon.fnct.tn` plus tard.
- **Sécurité** : Allez dans Supabase **Settings > API > Webhooks** pour restreindre les appels API uniquement depuis votre domaine Vercel.

## 4. Maintenance & Coûts
- **Coût total : 0€** (tant que vous avez moins de 50 000 utilisateurs actifs par mois).
- **Emails** : Par défaut, Supabase limite l'envoi d'emails d'authentification. Pour une production réelle, liez un compte **Resend** (gratuit jusqu'à 3000 emails/mois).
