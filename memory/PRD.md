# Outlook AI Classifier - PRD

## Original Problem Statement
Créer un connecteur Outlook pour classer automatiquement les emails dans des dossiers déjà créés, sans les déplacer manuellement. Compatible Outlook 365 (ancienne et nouvelle version).

## User Choices
- Classification par corps de mail (contenu)
- OpenAI GPT-5.2 pour l'IA
- Microsoft Graph API avec OAuth pour accès complet à Outlook 365

## Architecture

### Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: GPT-5.2 via Emergent LLM Key
- **Auth**: Microsoft Graph API OAuth 2.0

### Key Components
1. **AuthContext** - Gestion de l'authentification Microsoft
2. **MailAPI** - Interaction avec Microsoft Graph (emails, dossiers)
3. **RulesEngine** - Gestion des règles de classification
4. **AIClassifier** - Classification via GPT-5.2

## User Personas
1. **Professionnel débordé** - Reçoit 100+ emails/jour, veut automatiser le tri
2. **Manager** - Veut des emails clients dans un dossier, factures dans un autre
3. **Consultant** - Multiple projets, veut classifier par projet automatiquement

## Core Requirements (Static)
- [x] Connexion Microsoft OAuth
- [x] Liste des emails par dossier
- [x] Liste des dossiers Outlook
- [x] Création de règles de classification
- [x] Classification IA par contenu
- [x] Déplacement automatique des emails
- [x] Historique des classifications
- [x] Statistiques

## What's Been Implemented (January 2025)

### Backend (FastAPI)
- OAuth flow avec Microsoft Graph API
- Endpoints pour emails, dossiers, règles, classification
- Intégration GPT-5.2 via emergentintegrations
- Historique et statistiques en MongoDB

### Frontend (React)
- Page de connexion Microsoft
- Dashboard avec liste emails et détail
- Page de gestion des règles
- Page d'historique avec statistiques
- Design Swiss Utility (noir/blanc, minimaliste)

## Prioritized Backlog

### P0 (Critical - Requires User Action)
- [ ] Configurer MS_CLIENT_ID et MS_CLIENT_SECRET dans Azure Portal
- [ ] Définir MS_REDIRECT_URI correspondant

### P1 (High Priority)
- [ ] Classification automatique programmée (cron)
- [ ] Notifications de classification
- [ ] Batch classification de tous les nouveaux emails

### P2 (Medium Priority)
- [ ] Mode aperçu avant classification
- [ ] Export des règles
- [ ] Sous-dossiers support
- [ ] Multi-compte Outlook

### P3 (Nice to Have)
- [ ] Dark mode
- [ ] App mobile
- [ ] Webhooks pour notifications temps réel

## Next Tasks
1. User: Créer une app dans Azure Portal et configurer les credentials
2. Tester le flow OAuth complet
3. Créer des règles de classification
4. Tester la classification avec GPT-5.2
