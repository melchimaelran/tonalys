# Deployment

Tonalys deploys itself to a single VPS on every merge to `main`.

```
merge to main
  └─ .github/workflows/deploy.yml
       ├─ checks : lint + typecheck + test        (blocks on failure)
       ├─ build  : 3 Docker images → GHCR          (tagged :latest and :<sha>)
       └─ deploy : scp compose + Caddyfile → VPS → scripts/deploy.sh
                     └─ docker compose pull && up -d --wait
```

On the VPS, `caddy` is the only service with public ports (80/443). It
terminates TLS with an automatic Let's Encrypt certificate and reverse
proxies to `next`. Everything else (`next`, `nest`, `worker`, `postgres`,
`rabbitmq`, `minio`) is reachable only on the internal Compose network.

**No secret is ever committed.** Secrets live in exactly two places:
GitHub Actions secrets (VPS access only) and `/opt/tonalys/.env` on the
VPS (created by hand). The repo being public changes nothing here.

---

## 0. Prerequisites

- A VPS with a public IPv4. Ubuntu 24.04 LTS assumed below. **≥ 4 GB RAM**
  recommended — the worker loads PyTorch + madmom models. With less, the
  2 GB swap file below is not optional.
- The domain `melchimael.dev` managed at OVH (DNS zone editable).
- A GitHub Personal Access Token with the `read:packages` scope (classic
  token is fine) — the VPS uses it to pull the private images.

---

## 1. VPS one-time setup

SSH in as a sudo-capable user, then:

### Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
```

### Deploy user

The workflow logs in over SSH as an unprivileged `deploy` user that is
only allowed to run Docker.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

### Swap (safety net for a small VPS)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Also open 80 and 443 in the OVH VPS firewall if you enabled it there.

### App directory

```bash
sudo install -d -o deploy -g deploy /opt/tonalys /opt/tonalys/scripts
```

### The `.env` file

As the `deploy` user, create `/opt/tonalys/.env` from
[`.env.prod.example`](../.env.prod.example) and fill in real secrets:

```bash
sudo -iu deploy
cd /opt/tonalys
nano .env          # paste .env.prod.example, replace every CHANGE_ME
chmod 600 .env
```

Generate the values:

| Variable | How |
|---|---|
| `*_PASSWORD`, `JWT_SECRET` | `openssl rand -hex 32` |
| `AUTH_PASSWORD_HASH` | bcrypt hash of your login password — see below |

For the bcrypt hash, reuse the `nest` image once it exists in GHCR (after
the first build):

```bash
docker run --rm --entrypoint node \
  ghcr.io/melchimaelran/tonalys-nest:latest \
  -e "console.log(require('bcrypt').hashSync('YOUR_PASSWORD', 10))"
```

Then paste it into `.env` **with every literal `$` doubled to `$$`**
(Docker Compose interpolates `$xxx` in `.env` values — ADR-025).

### Log in to GHCR (so the VPS can pull the private images)

Still as the `deploy` user:

```bash
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u melchimaelran --password-stdin
```

The credential is stored in `/home/deploy/.docker/config.json` and
persists across deploys.

### SSH key for GitHub Actions → VPS

On your laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-tonalys" -f ~/.ssh/tonalys_deploy -N ""
ssh-copy-id -i ~/.ssh/tonalys_deploy.pub deploy@<VPS_IP>
ssh deploy@<VPS_IP> "docker ps"    # confirm key + docker access work
```

Keep the **private** key (`~/.ssh/tonalys_deploy`) for the next step.

---

## 2. DNS at OVH

OVH Manager → **Web Cloud** → **Domain names** → `melchimael.dev` → **DNS
zone** → *Add an entry*:

| Field | Value |
|---|---|
| Type | `A` |
| Sub-domain | `tonalys` |
| Target | `<VPS IPv4>` |

If the VPS has an IPv6 address, add a second entry: type `AAAA`,
sub-domain `tonalys`, target `<VPS IPv6>`.

Check propagation:

```bash
dig +short tonalys.melchimael.dev      # must return the VPS IP
```

Do this **before** the first deploy — Caddy can only obtain the
certificate once the name resolves to the VPS.

---

## 3. GitHub configuration

Repo → **Settings** → **Secrets and variables** → **Actions** → *New
repository secret*:

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP, or `tonalys.melchimael.dev` once DNS is live |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | full contents of `~/.ssh/tonalys_deploy` (incl. the `BEGIN`/`END` lines) |
| `VPS_SSH_PORT` | `22` (or your custom SSH port) |

Pushing to GHCR uses the built-in `GITHUB_TOKEN`; `deploy.yml` already
requests `packages: write` at the job level. If the `build` job ever
fails with a 403 on push, set **Settings → Actions → General → Workflow
permissions** to *Read and write permissions*.

---

## 4. First deploy

1. Put the deployment files on a branch, open a PR (CI runs the checks),
   merge it.
2. The merge triggers `deploy.yml`. The **first** `build` is slow
   (10–20 min — PyTorch, madmom, `chord-cnn-lstm` checkpoints); later
   builds reuse the GitHub Actions layer cache.
3. `build` creates three private packages under the account:
   `tonalys-next`, `tonalys-nest`, `tonalys-worker`.
4. `deploy` copies `docker-compose.prod.yml`, `Caddyfile` and
   `scripts/deploy.sh` to `/opt/tonalys` and runs the script, which pulls
   the freshly pushed images (pinned to the commit SHA), runs Prisma
   migrations as a one-shot, and starts the stack.
5. Open `https://tonalys.melchimael.dev`. First load may take ~30 s while
   Caddy fetches the certificate.

`nest` creates the MinIO `tracks` bucket on startup — nothing to do
manually.

---

## 5. Operations

All commands run on the VPS from `/opt/tonalys` as the `deploy` user.
`C` is shorthand for `docker compose -f docker-compose.prod.yml`.

```bash
$C ps                      # status of every service
$C logs -f nest            # follow one service's logs
$C logs --since 10m caddy  # recent logs (TLS issues live here)
$C restart nest            # restart one service
$C exec postgres psql -U tonalys tonalys   # DB shell
```

### Manual deploy / rollback

Each deploy is pinned to a commit SHA and the SHA-tagged images stay in
GHCR. To roll back:

```bash
IMAGE_TAG=<older-commit-sha> scripts/deploy.sh
```

### Track retention

The daily cleanup cron runs inside `nest` (`@nestjs/schedule`). To force
a run:

```bash
$C exec nest node apps/nest/dist/cleanup/cleanup.cli.js
```

### Going public (no login wall)

Edit `/opt/tonalys/.env`, set `AUTH_ENABLED=false`, then:

```bash
$C up -d          # recreates next + nest with the new env
```

`DailyQuotaGuard` then caps new analyses at 30 per UTC day, app-wide
(ADR-053). Revert by setting `AUTH_ENABLED=true` and `up -d` again.

---

## 6. Troubleshooting

| Symptom | Check |
|---|---|
| Deploy job: `Permission denied (publickey)` | `VPS_SSH_KEY` is the full private key; its `.pub` is in `/home/deploy/.ssh/authorized_keys`; `VPS_USER` = `deploy` |
| `docker compose pull`: `denied` / `unauthorized` | `docker login ghcr.io` was not done on the VPS as the `deploy` user, or the PAT lacks `read:packages` |
| No HTTPS / cert never issued | `dig +short tonalys.melchimael.dev` points at the VPS; ports 80 + 443 open (UFW **and** OVH firewall); `$C logs caddy` |
| Caddy returns 502 | `next` is unhealthy — `$C logs next` (often a bad `NEST_API_URL` or `nest` itself down) |
| `migrate` service fails | `$C logs migrate` — usually a wrong `DATABASE_URL` in `.env`, or Postgres not healthy yet |
| Worker OOM-killed mid-analysis | VPS RAM too low; confirm the swap file is active (`swapon --show`) |
