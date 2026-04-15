#!/bin/sh

set -e

echo 

if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  echo "⏳ Database kutilyapti: $DB_HOST:$DB_PORT"

  while ! nc -z $DB_HOST $DB_PORT; do
    sleep 1
  done

  echo 
fi

echo 

exec "$@"
