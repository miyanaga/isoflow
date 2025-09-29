#!/bin/sh
set -e

# Default port to 3000 if not set
if [ -z "$PORT" ]; then
  export PORT="3000"
fi

echo "Starting all-in-one server on port $PORT..."
echo "Static files will be served from /dist-app"
echo "API will be available at /api"

# Run the all-in-one production server directly
exec node /app/node_modules/.bin/ts-node --project tsconfig.server.json src/server/allInOneProduction.ts