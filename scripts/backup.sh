#!/usr/bin/env bash
set -euo pipefail

# pg_dump necesita la URL PostgreSQL, no la REST URL ni la service role key.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${1:-$repo_root/services/supabase/.env.local}"
if [[ ! -f "$env_file" ]]; then
  echo "No existe $env_file" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a
: "${SUPABASE_DB_URL:?Configura SUPABASE_DB_URL con la connection string PostgreSQL}"
command -v pg_dump >/dev/null || { echo "Falta pg_dump" >&2; exit 1; }
command -v tar >/dev/null || { echo "Falta tar" >&2; exit 1; }
mkdir -p "$repo_root/backups"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
pg_dump --dbname="$SUPABASE_DB_URL" --format=custom --no-owner --no-acl --file="$tmp/medalert.dump"
archive="$repo_root/backups/medalert-$stamp.tar.gz"
tar -czf "$archive" -C "$tmp" medalert.dump
echo "$archive"
if [[ -n "${BACKUP_RCLONE_DEST:-}" ]]; then
  : "${BACKUP_AGE_RECIPIENT:?Configura BACKUP_AGE_RECIPIENT para cifrar antes de subir a Drive}"
  command -v age >/dev/null || { echo "Falta age para cifrar el backup" >&2; exit 1; }
  command -v rclone >/dev/null || { echo "Falta rclone para subir el backup" >&2; exit 1; }
  encrypted="$tmp/medalert-$stamp.tar.gz.age"
  age -r "$BACKUP_AGE_RECIPIENT" -o "$encrypted" "$archive"
  rclone copyto "$encrypted" "${BACKUP_RCLONE_DEST%/}/medalert-$stamp.tar.gz.age"
  echo "Backup cifrado subido a $BACKUP_RCLONE_DEST"
fi
