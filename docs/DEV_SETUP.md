# Local Development Setup

This project uses a rootless container runtime (Podman) with `docker` and
`docker-compose` aliases. No system-wide Docker daemon is required.

## Why Podman?

- Fedora ships Podman by default.
- It is rootless, daemonless, and API-compatible with Docker for our use case.
- The `docker` / `docker-compose` commands below are wrappers around
  `podman` / `podman-compose` stored in `~/.local/bin`.

## Quick start

```bash
# 1. Start the local Postgres container
npm run db:up

# 2. Sync the Prisma schema (only needed the first time or after schema changes)
npm run db:push:local

# 3. Seed sample data (optional)
npm run db:seed:local

# 4. Run the dev server
npm run dev:local

# 5. Or run a production-like build locally
npm run build:local
```

## Available npm scripts

| Script | Purpose |
|--------|---------|
| `db:up` | Start the Postgres container via `docker-compose up -d db`. |
| `db:down` | Stop/remove the local containers. |
| `db:push:local` | Push the Prisma schema to the local DB. |
| `db:seed:local` | Run `prisma/seed.js` against the local DB. |
| `db:fresh:local` | Reset the local DB and re-seed. |
| `dev:local` | Start Next.js dev server using the local DB. |
| `build:local` | Build the app using the local DB. |

All `:local` scripts point to:

```
postgresql://blog_owner:I82HcwNASRPe@localhost:5432/blog?sslmode=disable
```

They do **not** touch the production Neon database.

## If you want real Docker instead

1. Install Docker Engine with sudo:

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and log back in
```

2. Remove the Podman wrappers:

```bash
rm ~/.local/bin/docker ~/.local/bin/docker-compose
```

The `npm run db:*` and `npm run *:local` scripts will continue to work.
