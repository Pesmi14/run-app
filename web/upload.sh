#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

echo "🚀 SPRINTUY — Upload webu"

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Nejdřív ulož změny pomocí git add a git commit."
  exit 1
fi

git fetch origin main

INDEX_FILE="$(git rev-parse --git-path sprintuy-upload.index)"

if [ -e "$INDEX_FILE" ]; then
  echo "❌ Pomocný index už existuje."
  exit 1
fi

trap 'rm -f "$INDEX_FILE"' EXIT

GIT_INDEX_FILE="$INDEX_FILE" git read-tree origin/main
GIT_INDEX_FILE="$INDEX_FILE" git rm -r -f --cached -q -- web
GIT_INDEX_FILE="$INDEX_FILE" git read-tree --prefix=web/ HEAD

TREE=$(GIT_INDEX_FILE="$INDEX_FILE" git write-tree)

COMMIT=$(
  printf "Update Sprintuy web\n" |
  git commit-tree "$TREE" -p origin/main
)

git push origin "$COMMIT:refs/heads/main"

echo "✅ Sprintuy web úspěšně nahrán!"
echo "🌐 https://sprintuy.cz"
