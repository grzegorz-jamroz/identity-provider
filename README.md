<h1 align="center">🪪️️ Identity Provider 🫆️</h1>

<p align="center">
    A secure and scalable <strong>identity provider</strong> for JWT authentication and Refresh Token management.
</p>

<p align="center">
    <img src="https://img.shields.io/badge/node.js->=24-blue?colorB=%2384ba64" alt="Node Version">
    <img src="https://img.shields.io/badge/coverage-100%25 files|100%25 lines-brightgreen" alt="Code Coverage">
    <img src="https://img.shields.io/badge/release-v1.1.0-blue" alt="Release Version">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square&colorB=darkcyan" alt="Read License">
</p>

# Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Development with Docker](#development-with-docker)

# Installation

1. Copy `.env` to `.env.local`

   ```shell
   cp .env .env.local
   ```

2. Customize the `.env.local` file with your configuration settings.

3. Execute SQL migration manually to set up the database schema. Remember to replace placeholders `<my_auth_db_name>`, `<user_table_name>`, `<refresh_token_table_name>` with your actual database and table names.

   ```sql
   CREATE DATABASE IF NOT EXISTS `<my_auth_db_name>`;
   USE `<my_auth_db_name>`;

   CREATE TABLE IF NOT EXISTS `<user_table_name>` (
     uuid       BINARY(16) NOT NULL,
     username   VARCHAR(50) NOT NULL,
     email      VARCHAR(255) NOT NULL,
     password   VARCHAR(255) NOT NULL,
     roles      JSON NOT NULL,
     created_at DATETIME     NOT NULL,
     updated_at DATETIME     NOT NULL,
     UNIQUE KEY unique_username (username),
     UNIQUE KEY unique_email (email),
     PRIMARY KEY (uuid)
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;

   CREATE TABLE IF NOT EXISTS `<refresh_token_table_name>` (
     uuid BINARY(16) NOT NULL,
     user_uuid BINARY(16) NOT NULL,
     device_info VARCHAR(255),
     iat DATETIME NOT NULL,
     exp DATETIME NOT NULL,
     created_at DATETIME NOT NULL,
     PRIMARY KEY (uuid)
   ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB;

   ALTER TABLE `<refresh_token_table_name>` ADD CONSTRAINT FK_IDX_REFRESH_TOKEN_USER FOREIGN KEY (user_uuid) REFERENCES `<user_table_name>` (uuid) ON DELETE CASCADE;
   ```

4. Run docker containers

   ```bash
   docker compose up -d
   ```

# Usage

## Register

Parameters:

| parameter | value                                       | required | default value |
|-----------|---------------------------------------------|----------|---------------|
| system    | key from `config/tenants.js` tenants object | `no`     | `default`     |

```bash
curl -X POST http://<host>:<port>/register \
-H "Content-Type: application/json" \
-d '{"username":"example","email":"test@example.com","password":"password"}'
```

## Login

| parameter | value                                       | required | default value |
|-----------|---------------------------------------------|----------|---------------|
| system    | key from `config/tenants.js` tenants object | `no`     | `default`     |

```bash
curl -X POST http://<host>:<port>/login \
-H "Content-Type: application/json" \
-d '{"username":"example","password":"password"}'
```

## Auth

| parameter | value                                       | required | default value |
|-----------|---------------------------------------------|----------|---------------|
| system    | key from `config/tenants.js` tenants object | `no`     | `default`     |

```bash
curl -X POST http://<host>:<port>/auth \
-H "Content-Type: application/json" \
-H "access_token: your_jwt_token"
```

## Refresh

| parameter | value                                       | required | default value |
|-----------|---------------------------------------------|----------|---------------|
| system    | key from `config/tenants.js` tenants object | `no`     | `default`     |

```bash
curl -X GET http://<host>:<port>/refresh \
-H "refresh_token: your_refresh_token"
```

```bash
curl -X GET http://<host>:<port>/refresh?system=my_app_1_prod \
-H "refresh_token: your_refresh_token"
```

## Logout

| parameter | value                                       | required | default value |
|-----------|---------------------------------------------|----------|---------------|
| system    | key from `config/tenants.js` tenants object | `no`     | `default`     |

```bash
curl -X GET http://<host>:<port>/logout \
-H "refresh_token: your_refresh_token" | jq
```

```bash
curl -X GET http://<host>:<port>/logout?system=my_app_1_prod \
-H "refresh_token: your_refresh_token" | jq
```

## Reset password

| parameter | value                                       | required | default value |
|-----------|---------------------------------------------|----------|---------------|
| system    | key from `config/tenants.js` tenants object | `no`     | `default`     |

```bash
curl -X POST http://<host>:<port>/send-reset-password-email \
-H "Content-Type: application/json" \
-d '{"email":"test@email.com"}'
```

# Multi Tenancy Support
To enable multi-tenancy just create `config/tenants-local.js` file and add new tenants inside.
For example add 3 tenants: `app-1-prod`, `app-1-test`, `app-2` and a default tenant that reads from environment variables.

```javascript
export const tenants = {
  'app-1-prod': {
    dbConfig: {
      database: 'my_app_1_prod',
      user: 'username',
      password: 'secure-password',
    },
  },
  'app-1-test': {
    dbConfig: {
      database: 'my_app_1_test',
    },
  },
  'app-2': {
    dbConfig: {
      database: 'my_app_2',
    },
    appConfig: {
      userTableName: 'users',
      refreshTokenTableName: 'tokens',
    },
  },
  // remove this default tenant if you don't want support it
  default: {
    dbConfig: {
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
    },
    appConfig: {
      userTableName: process.env.USER_TABLE_NAME || 'user',
      refreshTokenTableName: process.env.REFRESH_TOKEN_TABLE_NAME || 'refresh_token',
    },
  },
};
```

then specify the `system` parameter in the query or body (depends on method) to select the tenant.

If you want to disable `default` tenant just remove it from the `tenants` object.

---

# Development with Docker

## Setup

1. Copy `.env` to `docker/dev/.env`

   ```shell
   cp .env docker/dev/.env
   ```

2. Build and run the containers:

   ```shell
   docker compose -f docker/dev/docker-compose.yml up -d
   ```

3. You can access the application at `http://localhost:4000`.

## Run tests

```shell
docker compose -f docker/dev/docker-compose.yml exec app npm run test
```

## Run lint

```shell
docker compose -f docker/dev/docker-compose.yml exec app npm run lint:fix
```

## Run format

```shell
docker compose -f docker/dev/docker-compose.yml exec app npm run format
```
