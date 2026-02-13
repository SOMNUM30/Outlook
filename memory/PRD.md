# Outlook AI Classifier - PRD

## Original Problem Statement
Créer un connecteur Outlook pour classer automatiquement les emails dans des dossiers déjà créés, sans les déplacer manuellement. Compatible Outlook 365 (ancienne et nouvelle version). Déploiement sur Render.

## User Choices
- Classification par corps de mail (contenu)
- OpenAI GPT-4o-mini pour l'IA
- Microsoft Graph API avec OAuth pour accès complet à Outlook 365
- Affichage de 1000 e-mails par page avec pagination

## Architecture

### Tech Stack
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **AI**: OpenAI GPT-4o-mini (API standard)
- **Auth**: Microsoft Graph API OAuth 2.0
- **Deployment**: Render

### Key Components
1. **AuthContext** - Gestion de l'authentification Microsoft
2. **MailAPI** - Interaction avec Microsoft Graph (emails, dossiers)
3. **RulesEngine** - Gestion des règles de classification
4. **AIClassifier** - Classification via GPT-4o-mini

## Core Requirements (Static)
- [x] Connexion Microsoft OAuth
- [x] Liste des emails par dossier
- [x] Liste des dossiers Outlook (avec sous-dossiers)
- [x] Création de règles de classification
- [x] Classification IA par contenu
- [x] Déplacement automatique des emails
- [x] Historique des classifications
- [x] Statistiques
- [x] Filtres (lu/non lu, classé/sans correspondance)
- [x] Exclusion des e-mails épinglés
- [x] Pagination des e-mails (1000 par page)

## What's Been Implemented

### Backend (FastAPI)
- OAuth flow avec Microsoft Graph API
- Endpoints pour emails, dossiers, règles, classification
- Intégration OpenAI GPT-4o-mini (API standard)
- Historique et statistiques en MongoDB
- **Pagination des e-mails** avec `$count` de Microsoft Graph
- Traitement parallèle optimisé pour Tier 1 (batch de 10)

### Frontend (React)
- Page de connexion Microsoft
- Dashboard avec liste emails et détail
- Page de gestion des règles
- Page d'historique avec statistiques
- Design Swiss Utility (noir/blanc, minimaliste)
- **Boutons de pagination** (Précédent/Suivant/Numéros de page)
- Affichage du total d'e-mails et numéro de page

## Prioritized Backlog

### P0 (Fait - Done)
- [x] Pagination des e-mails (1000 par page avec navigation)
- [x] Optimisation du traitement parallèle pour compte Tier 1

### P1 (High Priority)
- [ ] Classification automatique programmée (cron)
- [ ] Notifications de classification
- [ ] Batch classification de tous les nouveaux emails

### P2 (Medium Priority)
- [ ] Support des boîtes aux lettres partagées
- [ ] Export des règles
- [ ] Multi-compte Outlook

### P3 (Nice to Have)
- [ ] Dark mode
- [ ] App mobile
- [ ] Webhooks pour notifications temps réel

## API Endpoints Clés
- `GET /api/mail/messages` - Liste paginée des e-mails (page, per_page, filter_read)
- `GET /api/mail/folders` - Liste des dossiers avec sous-dossiers
- `POST /api/classify/analyze` - Analyse IA des e-mails
- `POST /api/classify/execute` - Classification et déplacement

## Notes Techniques
- Le compte OpenAI de l'utilisateur est maintenant en Tier 1
- Batch size augmenté à 10 (vs 5 avant)
- Délai entre batches réduit à 0.5s (vs 1s avant)
- L'API Microsoft Graph nécessite `ConsistencyLevel: eventual` pour `$count`
