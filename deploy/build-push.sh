#!/usr/bin/env bash
# =============================================================================
# Build the production images and push them to ghcr.io.
#
# Usage (from anywhere; Git Bash on Windows works too):
#   ./deploy/build-push.sh                 # every image
#   ./deploy/build-push.sh frontend auth   # only the listed ones
#
# Env overrides:
#   IMAGE_REGISTRY  (default ghcr.io/szombatioi)  — must be lowercase
#   IMAGE_TAG       (default latest)
#   PLATFORM        (default linux/amd64)         — the server's architecture
#   WLK_DOCKERFILE  (default Dockerfile = GPU; use Dockerfile.cpu without a GPU)
#   NEXT_PUBLIC_SUBMIT_URL                        — support page form link
#
# Prerequisite: docker login ghcr.io (PAT with write:packages).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io/szombatioi}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
WLK_DOCKERFILE="${WLK_DOCKERFILE:-Dockerfile}"
NEXT_PUBLIC_SUBMIT_URL="${NEXT_PUBLIC_SUBMIT_URL:-https://docs.google.com/forms/d/e/1FAIpQLSfqyEax75Akz1E-ehEBFLcVEaelZBHBnr15ofskfJmdsbruSw/viewform?usp=publish-editor}"
WLK_REPO_DIR="live-transcription/whisperlivekit/repo"

build() { # <image-name> <context> <dockerfile> [extra buildx args...]
  local name="$1" context="$2" dockerfile="$3"; shift 3
  echo ">>> ${IMAGE_REGISTRY}/${name}:${IMAGE_TAG}"
  docker buildx build \
    --platform "$PLATFORM" \
    -f "$dockerfile" \
    -t "${IMAGE_REGISTRY}/${name}:${IMAGE_TAG}" \
    "$@" \
    --push \
    "$context"
}

build_frontend() {
  build hangbank-frontend hangbank_frontend hangbank_frontend/Dockerfile \
    --build-arg NEXT_PUBLIC_BACKEND_URL=/api \
    --build-arg NEXT_PUBLIC_TRANSCRIPTION_URL=/asr \
    --build-arg "NEXT_PUBLIC_SUBMIT_URL=${NEXT_PUBLIC_SUBMIT_URL}"
}
# backend + auth import ../shared, so their build context is the repo root
build_backend() { build hangbank-backend . hangbank_backend/Dockerfile; }
build_auth()    { build hangbank-auth    . auth/Dockerfile; }
build_aqc()     { build hangbank-audio-quality-checker audio-quality-checker audio-quality-checker/Dockerfile; }
build_s3()      { build hangbank-s3-storage-manager s3-storage-manager s3-storage-manager/Dockerfile; }
build_tpm()     { build hangbank-transcript-process-manager transcript-process-manager transcript-process-manager/Dockerfile; }
build_worker()  { build hangbank-fw-worker transcript-process-manager/workers transcript-process-manager/workers/Dockerfile; }
build_wlk() {
  if [[ ! -d "$WLK_REPO_DIR" ]]; then
    git clone https://github.com/QuentinFuxa/WhisperLiveKit "$WLK_REPO_DIR"
  fi
  # The Dockerfiles copy third_party/, which holds git submodules
  git -C "$WLK_REPO_DIR" submodule update --init --recursive
  build hangbank-whisperlivekit "$WLK_REPO_DIR" "$WLK_REPO_DIR/$WLK_DOCKERFILE"
}

ALL=(frontend backend auth aqc s3 tpm worker wlk)
if [[ $# -gt 0 ]]; then TARGETS=("$@"); else TARGETS=("${ALL[@]}"); fi

for t in "${TARGETS[@]}"; do
  case "$t" in
    frontend|backend|auth|aqc|s3|tpm|worker|wlk) "build_$t" ;;
    *) echo "Unknown image '$t' (choose from: ${ALL[*]})" >&2; exit 1 ;;
  esac
done

echo "Done: ${TARGETS[*]} -> ${IMAGE_REGISTRY} (${IMAGE_TAG}, ${PLATFORM})"
