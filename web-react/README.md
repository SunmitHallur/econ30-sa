# web-react (Vite + React + TypeScript)

This folder is a **separate** app from `website_v2/` (static HTML). Use it when you want **React**, **framer-motion**, and **react-icons** with a normal bundler.

## Commands

```bash
cd web-react
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
npm run preview  # serve production build
```

## What is installed here

| Package           | Status |
|-------------------|--------|
| `react` / `react-dom` | Yes |
| `framer-motion`   | Yes |
| `react-icons`     | Yes |
| `styled-jsx`      | **Not used with this Vite setup** (see below) |

## Why not styled-jsx on Vite 8?

**styled-jsx** needs its **Babel** transform (`styled-jsx/babel`) so `<style jsx>` turns into scoped CSS at build time.

**Vite 8** ships **`@vitejs/plugin-react` v6**, which uses **oxc** for JSX and **does not expose** the old `babel: { plugins: [...] }` hook. Older **plugin-react v4** (Babel-based) only supports **Vite ≤ 6**, so you cannot cleanly bolt styled-jsx onto the default Vite 8 React template without a custom pipeline.

**Practical options:**

1. **Stay on Vite (this folder)** — use **CSS Modules** (`*.module.css`), **Tailwind**, or **vanilla `index.css`** for component styles (what `App.module.css` demonstrates).
2. **Use Next.js** if you specifically want **styled-jsx** — Next compiles it out of the box in the App Router (inside **`'use client'`** components).

### Next.js + styled-jsx + framer-motion + react-icons (from repo root)

```bash
npx create-next-app@latest web-next --typescript --tailwind --eslint --app --no-src-dir
cd web-next
npm install framer-motion react-icons
```

Then add UI under **`/components/ui`** (or whatever path you set in `components.json` when you run `npx shadcn@latest init`). Keeping **`components/ui`** matters because the **shadcn CLI** installs primitives there and expects stable import aliases like `@/components/ui/button`.

Paste Kokonut/shadcn components into that folder and import them from your `app/` routes.

## Merging with `website_v2/`

- **Full migration:** move pages and assets into this app (or Next) and retire static `index.html`.
- **Hybrid (advanced):** build `npm run build`, then mount one bundle on a `<div id="root">` inside `website_v2/index.html` — you must align **asset base paths** and avoid duplicate globals (Chart.js, etc.).

For a course site, picking **one** stack (static **or** React) is usually simpler.
