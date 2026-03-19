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

## Testing the GraphQL API

### PR Preview URLs

Every PR deploys:
- **Web preview:** Firebase Hosting preview (link posted by Firebase bot)
- **API preview:** Cloud Run tagged revision (link posted as "API Preview URL" comment)

### Authenticating with GraphiQL

1. Open the **web preview** → Settings → tap **Copy Auth Token** (admin only)
2. Open the **API preview** URL in a browser (serves GraphiQL)
3. In GraphiQL, set HTTP Headers:
   ```json
   {"Authorization": "Bearer <paste-token-here>"}
   ```
4. Token expires after ~1 hour. Copy a new one if you get auth errors.

### Useful Queries

**List habits with frequency and due days:**
```graphql
{
  habits {
    name
    frequency {
      type
      daysOfWeek
      dueDays
    }
  }
}
```

**Check version:**
```graphql
{ version { commit deployedAt } }
```

**List allowed emails (admin only):**
```graphql
{ allowedEmails { email isAdmin } }
```
