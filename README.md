# Agendo — Monorepo (Opción A) — Setup Rápido (Windows)

Stack MVP:
- **Web**: Next.js + TypeScript + Tailwind
- **API**: Express + TypeScript + Prisma (**SQLite por defecto**)
- **IA**: DeepSeek via **Ollama** (opcional)

## 0) Requisitos
- Node.js 20+ y npm 10+ → https://nodejs.org/
- (Opcional) Ollama → https://ollama.com/download

> Si PowerShell te bloquea npm: abre PowerShell (Administrador) y ejecuta:
> `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` (elige **S**).

## 1) Instalar dependencias
```powershell
npm install --workspaces
```

## 2) API con SQLite (sin Docker)
```powershell
cd apps/api
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev   # API en http://localhost:4000
```
Chequeo: http://localhost:4000/health

## 3) Web
```powershell
cd ../../apps/web
npm run dev   # Web en http://localhost:3000
```

## 4) IA local (opcional)
1) Instalar Ollama.
2) En PowerShell: `ollama pull deepseek-chat`
3) Reinicia la API y prueba el botón "Probar IA" en la web.

## Variables de entorno
- `apps/api/.env` (SQLite por defecto):
```
DATABASE_URL=file:./dev.db
PORT=4000
OLLAMA_BASE_URL=http://localhost:11434
```
- `apps/web/.env.example`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Estructura
```
apps/
  api/  -> Express + Prisma
  web/  -> Next.js (App Router)
packages/
  shared/ -> Tipos compartidos
```
