# Éles telepítés (ghcr.io + docker-compose.prod.yml)

## Image-ek

| Image (`ghcr.io/szombatioi/…`)        | Build context                            | Dockerfile                                   |
|--------------------------------------|------------------------------------------|----------------------------------------------|
| `hangbank-frontend`                  | `hangbank_frontend/`                     | `hangbank_frontend/Dockerfile`               |
| `hangbank-backend`                   | `.` (gyökér, a `shared/` miatt)          | `hangbank_backend/Dockerfile`                |
| `hangbank-auth`                      | `.` (gyökér, a `shared/` miatt)          | `auth/Dockerfile`                            |
| `hangbank-audio-quality-checker`     | `audio-quality-checker/`                 | `audio-quality-checker/Dockerfile`           |
| `hangbank-s3-storage-manager`        | `s3-storage-manager/`                    | `s3-storage-manager/Dockerfile`              |
| `hangbank-transcript-process-manager`| `transcript-process-manager/`            | `transcript-process-manager/Dockerfile`      |
| `hangbank-fw-worker`                 | `transcript-process-manager/workers/`    | `transcript-process-manager/workers/Dockerfile` |
| `hangbank-whisperlivekit`            | `live-transcription/whisperlivekit/repo/`| `…/repo/Dockerfile` (GPU) vagy `Dockerfile.cpu` |

A frontend `NEXT_PUBLIC_*` változói build-időben égnek be: `NEXT_PUBLIC_BACKEND_URL=/api`,
`NEXT_PUBLIC_TRANSCRIPTION_URL=/asr` — mindkettő relatív, így az image független a szerver címétől.

## Build + push (fejlesztői gépen)

```bash
# egyszer: GitHub PAT (classic) write:packages joggal
echo "<PAT>" | docker login ghcr.io -u Szombatioi --password-stdin

# minden image (a WhisperLiveKit repót is leklónozza, ha hiányzik)
./deploy/build-push.sh

# csak néhány
./deploy/build-push.sh frontend backend

# verziózott tag, CPU-s WhisperLiveKit
IMAGE_TAG=v1.0.0 WLK_DOCKERFILE=Dockerfile.cpu ./deploy/build-push.sh wlk
```

Alapértelmezett platform: `linux/amd64` (Apple Siliconon / ARM-on is a szerverre épít; `PLATFORM=` felülírja).

## Szerver előkészítése (egyszer)

1. Docker Engine + Compose plugin (≥ 2.24, a `!reset`/`!override` miatt).
2. GPU-hoz: NVIDIA driver + `nvidia-container-toolkit`, majd `sudo nvidia-ctk runtime configure --runtime=docker && sudo systemctl restart docker`.
3. Tűzfal: csak 22, 80, 443 (tcp) és 443/udp nyitva.
4. Ha a ghcr csomagok privátak: `docker login ghcr.io` egy `read:packages` jogú PAT-tal.

## Fellövés

```bash
git clone --depth 1 -b main git@github.com:Szombatioi/hangbank_v2.git && cd hangbank_v2
# a compose-hoz csak ezek kellenek: docker-compose.prod.yml, .env, Caddyfile,
# deploy/storages.override.yml, test-hangbank-local/{storages,minio}.yaml

nano .env   # PUBLIC_HOST, JWT_SECRET (openssl rand -hex 32), DB/MinIO jelszavak, DEFAULT_ADMIN_PASSWORD
docker compose -f docker-compose.prod.yml config --quiet   # validálás
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f whisperlivekit   # első induláskor modellt tölt le
```

Ha a régi `docker-compose.yml` stack fut a szerveren, előbb állítsd le (`docker compose down`), mert ugyanazokat a
konténerneveket és portokat használja.

## Frissítés

```bash
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -f
```

## Hálózat

- Csak a **Caddy** publikál portot (80/443). Útvonalak: `/` → frontend, `/api/*` → backend, `/minio/*` → MinIO
  (presigned audio URL-ek), `/asr` → WhisperLiveKit (WebSocket).
- A `/api` és `/minio` kifelé is kell, mert a böngésző hívja őket; az auth, s3-storage-manager, TPM, AQC,
  Postgres, Redis és a MinIO konzol csak a `hangbank-internal` hálózaton érhető el.
- Admin hozzáférés: DB-hez `docker exec -it hangbank-db psql -U <HANGBANK_DB_USER> <HANGBANK_DB_NAME>`;
  a MinIO konzolhoz ideiglenesen adj a `minio`-nak `127.0.0.1:9001:9001` portot, és nézd SSH-tunnellel
  (`ssh -L 9001:localhost:9001 <szerver>`).
- A TPM által indított worker konténerek is a `hangbank-internal` hálózatra kerülnek (`WORKER_NETWORK`).
