# Repository Guidelines

Isoflow is an open-source React/TypeScript diagramming tool. This guide keeps contributors aligned with the current workspace conventions.

## Project Structure & Module Organization
- `src/` holds application code; UI in `src/components`, state in `src/stores`, hooks in `src/hooks`, utilities in `src/utils`, and styles in `src/styles`.
- `src/server/` contains the optional Node/Express services and managers; integration tests live in `src/server/tests`.
- `src/assets`, `src/examples`, and `src/fixtures` provide sample data and static assets referenced by the editor.
- Tests sit alongside modules (`src/utils/__tests__`, `src/stores/reducers/__tests__`); bundle outputs land in `dist/` and app demos in `dist-app/`.
- Supporting configs live in `webpack/`, `scripts/`, and `docs/`; avoid editing generated files in `dist/`.

## Build, Test, and Development Commands
- `yarn start` launches the webpack dev server at `localhost:8080`, loading the example gallery.
- `yarn dev` rebuilds bundles with nodemon when you change TypeScript files.
- `yarn server:dev` runs the standalone API via ts-node; pair it with `yarn start` for full-stack work.
- `yarn build` produces production bundles, type declarations, and path alias rewrites.
- `yarn lint` and `yarn lint:fix` run TypeScript checks plus ESLint/Prettier; `yarn test` executes the Jest suite.

## Coding Style & Naming Conventions
- Follow the ESLint Airbnb + Prettier rules (2-space indent, single quotes, trailing commas where allowed).
- Name React components and Zustand stores with PascalCase, hooks with `useCamelCase`, utility functions with lowerCamelCase.
- Prefer `src/...` alias imports configured in `tsconfig.json`; keep module folders cohesive (component + styles + tests).

## Testing Guidelines
- Jest with `ts-jest` powers the suite; place tests in `__tests__` folders using the `.test.ts(x)` suffix.
- Cover new reducers, hooks, and server managers; mimic fixtures in `src/fixtures` when stubbing data.
- Run `yarn test --watch` for rapid feedback and ensure `yarn test --coverage` stays steady before release.

## Commit & Pull Request Guidelines
- Keep commits small with imperative subjects (Japanese or English is fine) and include version bumps like `1.3.3` as standalone commits.
- PRs need a concise summary, validation checklist (`yarn lint`, `yarn test`), linked issues, and screenshots or GIFs for UI or interaction changes.
- Request review before merging, and update documentation under `docs/` or `README.md` when behavior shifts.
