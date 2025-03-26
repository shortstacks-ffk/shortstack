#!/bin/bash
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Database setup complete."
 
#  The  deploy-db.sh  script is responsible for generating the Prisma client and running the database migrations. 
#  The  generate  command generates the Prisma client based on the schema defined in the  schema.prisma  file. The  migrate deploy  command applies the migrations to the database. 
#  The  set -e  command ensures that the script exits immediately if any command fails. 
#  Make the script executable by running the following command: 
#  chmod +x scripts/deploy-db.sh
 
#  Now, you can run the script by executing the following command: 
#  ./scripts/deploy-db.sh