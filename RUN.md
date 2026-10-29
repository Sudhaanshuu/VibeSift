# Running VibeSift Locally

### Quick Start (2 Commands)

```bash
# 1. Install all dependencies (root & backend)
npm run setup

# 2. Start everything (Frontend + Backend + Local SQLite DB)
npm run dev
```

---

### What Runs Automatically:

- **Frontend:** http://localhost:5173 (React 19 + Vite)
- **Backend API:** http://localhost:4000 (Express)
- **Database & Storage:** `.local_storage/vibesift.sqlite` (Built-in Node.js SQLite & local file storage — **zero cloud or external DB setup required**)
- **API Proxy:** Requests to `/api/*` on port 5173 are automatically proxied to port 4000.

---

### Optional Individual Commands:

- `npm run dev:frontend` — Run only the Vite frontend
- `npm run dev:backend` — Run only the Express backend
- `npm test` — Run frontend test suite
- `npm run test:backend` — Run backend test suite
