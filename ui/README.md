# CampusDash UI

React and TypeScript app built with Vite 8 and Tailwind CSS 4.

## Run locally

From this directory:

```sh
nvm use
npm ci
npm run dev
```

If you do not use nvm, use Node.js 20.19+ or 22.12+ as required by Vite.
The `.nvmrc` selects Node.js 22.22.0. Check `node --version` if startup
fails with a `node:util` / `styleText` error.

## Checks

```sh
npx tsc --noEmit
npm run build
```

Tailwind is compiled by `@tailwindcss/vite` in `vite.config.ts`.
`main.tsx` imports `index.css`, which imports Tailwind and defines the theme.
Restart the dev server after changing the Vite configuration.
