#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

HOST=root@188.127.237.116
DIR=/opt/tron-wallet

echo "building the web bundle"
(cd frontend && flutter build web --release)

echo "uploading tracked sources"
git archive HEAD | ssh "$HOST" "mkdir -p $DIR && tar -x -C $DIR"

echo "uploading the web bundle"
ssh "$HOST" "rm -rf $DIR/frontend/build/web && mkdir -p $DIR/frontend/build"
tar czf - -C frontend/build web | ssh "$HOST" "tar xzf - -C $DIR/frontend/build"

echo "uploading environment"
ssh "$HOST" "cat > $DIR/.env" < .env

echo "restarting the stack"
ssh "$HOST" "cd $DIR && docker compose up -d --build"
ssh "$HOST" "cd $DIR && docker compose ps --format '{{.Service}} | {{.State}}'"
