#!/bin/sh
set -e

# Function to run migrations
run_migrations() {
  echo "Running database migrations..."
  npm run migration:run || {
    echo "Migration failed, but continuing..."
    return 0
  }
  echo "Migrations completed successfully"
}

# Function to start the application
start_app() {
  echo "Starting application..."
  exec node dist/index.js
}

# Main execution
if [ "$1" = "migrate" ]; then
  # Run migrations only
  run_migrations
elif [ "$1" = "migrate-and-start" ]; then
  # Run migrations then start app
  run_migrations
  start_app
elif [ "$1" = "start" ]; then
  # Start app only (skip migrations)
  start_app
else
  # Default: run migrations then start app if RUN_MIGRATIONS is not set to false
  if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
    run_migrations
  fi
  start_app
fi
