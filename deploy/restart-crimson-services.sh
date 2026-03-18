#!/usr/bin/env sh
set -eu

SERVICES="crimson-wars crimson-wars-2 crimson-wars-3 crimson-wars-4"

if [ -f ./data/news.json ]; then
  chown www-data:www-data ./data/news.json 2>/dev/null || true
  chmod 664 ./data/news.json 2>/dev/null || true
fi

echo "Restarting Crimson Wars services..."
systemctl restart $SERVICES

echo
echo "Service status:"
systemctl --no-pager --plain --full status $SERVICES | sed -n '1,120p'
