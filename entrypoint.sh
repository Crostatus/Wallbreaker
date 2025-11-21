#!/bin/sh
set -e

echo "Running migrations..."
deno task migrate

echo "Starting application..."
exec deno task dev
