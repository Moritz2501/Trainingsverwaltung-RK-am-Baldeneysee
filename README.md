# RK Baldeneysee – Trainerportal

Interne Web-App zur Verwaltung von Rudertraining für den **Ruderklub am Baldeneysee**.

## Tech-Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui-style Komponenten
- PostgreSQL
- Prisma ORM
- NextAuth (Credentials, JWT Session)
- zod Validation
- next-themes (Dark/Light Toggle, Standard = Dark)
- Vitest (Basis-Tests)

## Branding / Produkttexte

- Produktname: **RK Baldeneysee – Trainerportal**
- Kurzname: **RK Baldeneysee**
- Browser Title: **RK Baldeneysee | Trainerportal**
- Login-Titel: **Trainerportal – Ruderklub am Baldeneysee**
- Footer: **© {aktuelles Jahr} Ruderklub am Baldeneysee – Intern**
- SEO: `noindex,nofollow`

## Rollen & Rechte (RBAC)

- `ADMIN`
  - Benutzer anlegen
  - Benutzernamen ändern
  - Rollen setzen
  - Accounts aktiv/deaktiv setzen
  - temporäre Passwörter zurücksetzen
  - Vollzugriff auf alle Inhalte
- `LEITUNG`
  - Trainingsgruppen erstellen/verwalten
  - Trainer zu Gruppen zuweisen
  - Kalender-Einträge erstellen/bearbeiten/löschen
  - Ankündigungen erstellen/archivieren
- `TRAINER`
  - Nur zugewiesene Trainingsgruppen sehen und bearbeiten (Trainingsinhalte/Notizen über Gruppenbeschreibung)
  - Kalender lesen (read-only)
  - Ankündigungen lesen

Keine öffentliche Registrierung, Sportler-Registrierung ist nicht vorgesehen.

## Setup lokal

### 1) Abhängigkeiten installieren

```bash
npm install
```

### 2) ENV konfigurieren

`.env` anlegen (oder `.env.example` kopieren):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rk_baldeneysee"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="bitte-starken-secret-setzen"
```

### 3) Prisma Migration + Client

```bash
npm run prisma:migrate
npm run prisma:generate
```

### 4) Seed ausführen

```bash
npm run prisma:seed
```

Initialer Admin wird angelegt:

- Benutzername: `admin`
- Passwort: `admin123!`

**Wichtig:** Passwort direkt nach erstem Login ändern.

### 5) Dev-Server starten

```bash
npm run dev
```

App läuft auf `http://localhost:3000`.

## Nützliche Scripts

- `npm run dev` – Entwicklung
- `npm run build` – Production Build
- `npm run start` – Production Start
- `npm run lint` – ESLint
- `npm test` – Vitest
- `npm run prisma:generate` – Prisma Client generieren
- `npm run prisma:migrate` – Prisma Migration lokal anwenden
- `npm run prisma:seed` – Seed ausführen

## Vercel Deployment

1. Repo bei Vercel importieren.
2. Environment Variables setzen:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (z. B. `https://deine-domain.vercel.app`)
   - `NEXTAUTH_SECRET`
3. Build Command: `npm run build`
4. Optional nach erstem Deploy im Projekt-Terminal ausführen:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## Projektstruktur (Auszug)

- `app/login` – Login
- `app/(protected)/dashboard` – Dashboard
- `app/(protected)/calendar` – Kalender
- `app/(protected)/groups` – Trainingsgruppen
- `app/(protected)/groups/[id]` – Gruppendetail
- `app/(protected)/admin/users` – Admin User Management
- `app/(protected)/admin/users/new` – User anlegen
- `app/(protected)/profile` – Passwort ändern
- `app/(protected)/announcements` – Ankündigungen
- `app/actions.ts` – Server Actions + serverseitige Authorisierung
- `lib/auth.ts` – NextAuth + Guard Helper (`requireRole`)
- `lib/rbac.ts` – zentrale RBAC-Regeln
- `proxy.ts` – Login Guard für geschützte Routen
- `prisma/schema.prisma` – Datenmodell
- `prisma/seed.ts` – Initialdaten
- `tests/*` – Basis-Tests (RBAC + zod)

## Sicherheit

- Passwort-Hashing mit `bcryptjs`
- Login Rate-Limiting (minimal, in-memory)
- Serverseitige RBAC-Prüfungen in allen mutierenden Actions
- Deaktivierte Accounts können sich nicht einloggen
- Keine sensiblen Daten in Logs
