#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/perf-bi"

echo "=== Clonando/Actualizando Perf-Bi ==="
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR"
  git pull
else
  git clone https://github.com/swaalt/Perf-Bi.git "$REPO_DIR"
  cd "$REPO_DIR"
fi

echo "=== Construyendo imagen Docker ==="
docker compose build

echo "=== Deteniendo contenedor anterior (si existe) ==="
docker compose down 2>/dev/null || true

echo "=== Iniciando Perf-Bi ==="
docker compose up -d

echo "=== Hecho ==="
echo "Perf-Bi corriendo en: http://$(curl -s ifconfig.me):3000"
