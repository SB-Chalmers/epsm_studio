# Studio rebuild scaffold

This React, TypeScript and Vite application displays the introduction to the
planned research workspace for building modelling and urban studies. It is the
frontend starting point for the rebuild from the repository's `main` baseline.
The existing production application remains in the repository's legacy folders.

Building editing, map selection, authentication, settings, package adapters and
job execution are planning work. This scaffold contains one page and makes no
API requests. A backend and its deployment belong to later implementation work;
there is no backend server to start for this page.

## Run locally

Use Node.js 20.19 or newer and npm. Run these commands from this directory:

```sh
npm ci
npm run dev
```

Open the loopback URL printed by Vite. The development and preview servers bind
to `127.0.0.1`. Runtime dependencies are React and React DOM. Tool versions match
the versions already installed in the existing frontend and are pinned in the
lockfile.

## Check and build

```sh
npm run check
npm run build
npm run preview
```

`check` verifies TypeScript. `build` repeats that check and writes the production
bundle to ignored `dist/`. `preview` serves that bundle locally. There is no
deployment command in this scaffold.

EPSM-owned source uses the repository's [MIT license](../../LICENSE.md).
