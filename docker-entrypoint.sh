#!/bin/sh
set -e

# API_URL is used by webpack dev server for proxy target
# Default to localhost:3080 if not set
if [ -z "$API_URL" ]; then
  export API_URL="http://localhost:3080"
  echo "API_URL not set, using default: $API_URL (for webpack proxy)"
else
  echo "Using API_URL: $API_URL (for webpack proxy)"
fi

# Trap SIGTERM (15) and SIGINT (2) signals and forward to child processes
_term() {
  echo "Caught termination signal!"
  if [ -n "$client_pid" ]; then
    kill -15 "$client_pid" 2>/dev/null || true
  fi
  if [ -n "$server_pid" ]; then
    kill -15 "$server_pid" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit 0
}

# Use signal numbers instead of names for POSIX compatibility
# 2 = SIGINT, 15 = SIGTERM
trap _term 2 15

# Start client in background
echo "Starting client with API_URL=$API_URL..."
yarn start &
client_pid=$!
echo "Client PID: $client_pid"

# Start server in background
echo "Starting server on $API_URL..."
yarn server:dev &
server_pid=$!
echo "Server PID: $server_pid"

# Wait for all background processes
echo "Waiting for processes to complete..."
wait

# Exit with the last exit status
exit $?