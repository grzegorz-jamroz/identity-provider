<h1 align="center">🪪️️ Identity Provider 🫆️</h1>

<p align="center">
    A secure and scalable <strong>identity provider</strong> for JWT authentication and Refresh Token management.
</p>

<p align="center">
    <img src="https://img.shields.io/badge/node.js->=24-blue?colorB=%2384ba64" alt="Node Version">
    <img src="https://img.shields.io/badge/coverage-100%25 files|100%25 lines-brightgreen" alt="Code Coverage">
    <img src="https://img.shields.io/badge/release-v1.0.0-blue" alt="Release Version">
    <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square&colorB=darkcyan" alt="Read License">
</p>

# Installation

1. Copy .env.example to .env

   ```shell
   cp .env.example .env
   ```

2. Customize the .env file with your configuration settings.

3. Execute SQL migration manually to set up the database schema. Remember to replace placeholders `<my_auth_db_name>`, `<user_table_name>`, `<refresh_token_table_name>` with your actual database and table names.

```sql
CREATE DATABASE IF NOT EXISTS `<my_auth_db_name>`;
USE `<my_auth_db_name>`;

CREATE TABLE IF NOT EXISTS `<user_table_name>` (
  uuid       BINARY(16) NOT NULL,
  username   VARCHAR(50),
  email      VARCHAR(255),
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

```bash
curl -X POST http://<host>:<port>/register \
-H "Content-Type: application/json" \
-d '{"username":"example","email":"test@example.com","password":"password"}'
```

## Login

```bash
curl -X POST http://<host>:<port>/login \
-H "Content-Type: application/json" \
-d '{"username":"example","password":"password"}'
```

## Auth

```bash
curl -X POST http://<host>:<port>/auth \
-H "Content-Type: application/json" \
-H "access_token: your_jwt_token"
```

## Refresh

```bash
curl -X GET http://<host>:<port>/refresh \
-H "refresh_token: your_refresh_token"
```

## Logout

```bash
curl -X GET http://<host>:<port>/logout \
-H "refresh_token: your_refresh_token" | jq
```

# Development with Docker

## Setup

1. Copy .env.example to docker/dev/.env

   ```shell
   cp .env.example docker/dev/.env
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
