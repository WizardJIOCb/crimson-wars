#!/usr/bin/env sh
set -eu

SERVICES="crimson-wars crimson-wars-2 crimson-wars-3 crimson-wars-4"

echo "Restarting Crimson Wars services..."
systemctl restart $SERVICES

echo
echo "Service status:"
systemctl --no-pager --plain --full status $SERVICES | sed -n '1,120p'
