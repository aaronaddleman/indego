# indego

## Setup

### Git Hooks

This repo includes a pre-commit hook that runs the web client linter before each commit. To enable it:

```bash
git config core.hooksPath .githooks
```

The hook automatically runs `docker compose run --rm lint` in `web/` when web files are staged. Commits are blocked if lint fails.

### Web Client (Docker)

All web client commands run from the `web/` directory:

```bash
cd web/

# Start dev server (hot reload)
docker compose up dev

# Run linter
docker compose run --rm lint

# Build for production
docker compose run --rm build

# Run tests
docker compose run --rm test

# Add/remove npm packages (updates both package.json and package-lock.json)
docker compose run --rm npm install <package-name>
docker compose run --rm npm uninstall <package-name>
```

**Important:** Never edit `package.json` by hand. Always use the `npm` Docker service to add/remove packages. This keeps `package-lock.json` in sync. CI uses `npm ci` which fails if the lock file is out of sync.
