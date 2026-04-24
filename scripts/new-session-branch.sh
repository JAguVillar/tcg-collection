#!/usr/bin/env bash

set -e

BASE_BRANCH="development"

TASK_NAME="$1"

if [ -z "$TASK_NAME" ]; then
  TASK_NAME="session"
fi

SAFE_NAME=$(echo "$TASK_NAME" \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/[^a-z0-9]/-/g' \
  | sed 's/-\+/-/g' \
  | sed 's/^-//' \
  | sed 's/-$//')

DATE=$(date +%Y-%m-%d)
BRANCH_NAME="feature/${DATE}-${SAFE_NAME}"

git fetch origin

git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"

git checkout -b "$BRANCH_NAME"

echo "Nueva branch creada: $BRANCH_NAME"