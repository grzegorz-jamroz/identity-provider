#!/bin/bash
set -e

echo "Generating database schema from template..."

# Path to the template
TEMPLATE_FILE="/docker-entrypoint-initdb.d/schema.sql.template"
# Temporary output file
OUTPUT_FILE="/tmp/schema_generated.sql"

# 1. Define the names
MAIN_DB="$MARIADB_DATABASE"
TEST_DB="${MARIADB_DATABASE}_test"

# Check if required variables are present
if [ -z "$USER_TABLE_NAME" ] || [ -z "$REFRESH_TOKEN_TABLE_NAME" ] || [ -z "$MAIN_DB" ]; then
  echo "Error: Required environment variables are missing."
  exit 1
fi

run_schema_setup() {
    local TARGET_DB=$1
    echo "-------------------------------------------------"
    echo "Setting up database: $TARGET_DB"

    # Use sed to replace placeholders with environment variables
    # We use | as delimiter in case inputs contain slashes, though unlikely for table names.
    # 1. Replace DB name
    sed "s|<my_auth_db_name>|$TARGET_DB|g" "$TEMPLATE_FILE" > "$OUTPUT_FILE"
    # 2. Replace Table names
    sed -i "s|<user_table_name>|$USER_TABLE_NAME|g" "$OUTPUT_FILE"
    sed -i "s|<refresh_token_table_name>|$REFRESH_TOKEN_TABLE_NAME|g" "$OUTPUT_FILE"

    # Execute SQL
    # We do not specify a DB in the command line because the SQL file contains 'USE <db_name>'
    mariadb -u root -p"$MARIADB_ROOT_PASSWORD" < "$OUTPUT_FILE"
}

grant_permissions() {
    local TARGET_DB=$1
    echo "-------------------------------------------------"
    echo "Granting permissions for user '$MARIADB_USER' on '$TARGET_DB'..."

    mariadb -u root -p"$MARIADB_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON \`$TARGET_DB\`.* TO '$MARIADB_USER'@'%'; FLUSH PRIVILEGES;"
}

# --- EXECUTION ---

# 1. Setup Main Database
run_schema_setup "$MAIN_DB"
grant_permissions "$MAIN_DB"

# 2. Setup Test Database
run_schema_setup "$TEST_DB"
grant_permissions "$TEST_DB"

echo "-------------------------------------------------"
echo "Initialization complete. Created '$MAIN_DB' and '$TEST_DB'."
