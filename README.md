# initStarterKit

A ready-to-use host app that **runs the forms, pages, and apps you build in
[initCraft](https://builder.initcraft.com/)**. It renders everything through the
`sd-render` library — you customize, configure, and deploy.

- ⚡ Vue 3 + Vite + TypeScript
- 🎨 Element Plus UI
- 🧩 initCraft low-code dev tool (70+ widgets/inputs)
- 📝 Create Forms, UI, SQL, API, Reports, Apps — export / import / restore online
- 🔐 Two-Factor Authentication + Google OAuth2
- 🚀 One-click deploy to [Vercel](https://vercel.com/)
- 🛠️ Fully customizable

> Builder: https://builder.initcraft.com/ · Server SDK: https://github.com/appxq/init-server-sdk

---

## Quick Start

Get running locally in 4 steps.

### 1. Requirements

- Node.js 20+ and npm
- A backend server reachable (default `http://localhost:3005`)

### 2. Install

```bash
cd init-starter-kit
npm i
```

### 3. Configure

Edit `public/site-config.js` and point `SERVER_HOST` at your backend
(see [Configuration](#configuration) below). It is served as a static file — no
rebuild needed when you change it.

### 4. Run

```bash
npm run dev      # → http://localhost:5173
```

That's it. Open the URL and log in.

---

## Configuration

### `public/site-config.js`

Loaded by the browser at runtime and exposed as `window.APP_CONFIG`. `SERVER_HOST`
switches automatically between local and production based on the hostname.

```js
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SERVER_HOST = isLocal ? 'http://localhost:3005' : 'https://api.initcraft.com';

const API_PATH = '/api';
const ASSETS_PATH = '/assets';
const REFRESH_TOKEN = 1000 * 60 * 60 * 1; // 1 hour

const APP_NAME = 'My StarterKit';
const APP_SLOGAN = 'Powered by initCraft ©2025';
const APP_VERSION = 'v1.5.0';
```

| Key            | What it does                                          |
| -------------- | ---------------------------------------------------- |
| `SERVER_HOST`  | Backend base URL (local vs. production auto-switch)  |
| `API_PATH`     | API path prefix (default `/api`)                     |
| `ASSETS_PATH`  | Static assets path (default `/assets`)               |
| `REFRESH_TOKEN`| Token refresh interval in ms                         |
| `APP_NAME`     | App display name                                      |
| `APP_SLOGAN`   | Tagline shown in the UI                              |
| `APP_VERSION`  | Displayed version string                             |
| `APP_LOGO_TYPE`| Logo type: `svg` or `img`                            |

### `.env`

```
VITE_PUBLIC_KEY=
```

---

## Update the Renderer (sd-render)

`sd-render` is the library that renders your initCraft forms. Pull the latest when
the builder ships new features:

```bash
npm install sd-render@latest
```

---

## Keep Your Fork Up to Date

If you forked this repo, add the original as `upstream` once:

```bash
git remote add upstream https://github.com/appxq/init-starter-kit.git
git remote -v   # verify
```

Then sync the latest version any time:

```bash
git fetch upstream
git merge upstream/main
```

---

## Build & Deploy

### Build locally

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build
```

### Deploy to Vercel

1. Set `SERVER_HOST` in `public/site-config.js` to your production backend
2. Vercel → **Add New → Project**
3. **Import** your Git repository
4. Framework Preset: **Vite**
5. **Deploy**

---

## Scripts Reference

| Script            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start dev server (port 5173)             |
| `npm run build`   | Production build → `dist/`                |
| `npm run preview` | Preview the production build              |
| `npm run typecheck` | Type check with vue-tsc                 |
| `npm run lib`     | Build renderer library bundle            |
| `npm run lib:ts`  | Build library + emit type declarations    |
