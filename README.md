# DevTube Platform - Backend

## Overview

DevTube Platform is a backend system built using the **NestJS** framework, designed with a **microservices architecture**. It consists of multiple services that communicate with each other via **RabbitMQ**. Each service is responsible for a specific domain of the application.

## Project Structure

The backend is organized into the following microservices:

1. **Auth Service**

- Handles user authentication and authorization.
- Communicates with the database to manage user data.

2. **Video Service**

- Manages video metadata, including uploading, updating, and retrieving video information.

3. **Upload Service**

- Handles video upload tasks such as generate presigned-url.

4. **API Gateway**

- Acts as the entry point for client applications.
- Routes requests to the appropriate microservices.

Each service has its own folder under `devtube-be` and follows the same structure:

```
.env
.eslintrc.js
.gitignore
.prettierrc
eslint.config.js
nest-cli.json
package.json
README.md
src/
tsconfig.json
tsconfig.build.json
```

### Key Components

- **`src/`**: Contains the source code for the service.
- **`config/`**: Configuration files for RabbitMQ, database, and other settings.
- **`prisma/`**: Prisma schema and database-related files.
- **`processor/`** (Processing Service): Handles video processing logic.
- **`video/`** (Video Service): Manages video-related operations.
- **`auth/`** (Auth Service): Manages authentication and user data.

---

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **Yarn** (or npm)
- **Docker** (for RabbitMQ and PostgreSQL)

---

## Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-repo/devtube-platform.git
cd devtube-platform/devtube-be
```

### Step 2: Install Dependencies

Navigate to each service folder and install dependencies:

```bash
cd auth-service
yarn install

cd ../video-service
yarn install

cd ../Upload-service
yarn install

cd ../api-gateway
yarn install
```

### Step 3: Configure Environment Variables

Each service has an `.env` file. Update the following variables as needed:

- `DATABASE_URL`: PostgreSQL connection string.
- `RABBITMQ_URL`: RabbitMQ connection string.
- `RABBITMQ_QUEUE`: Queue name for the service.

---

## Running the Services

### Step 1: Start RabbitMQ and PostgreSQL

Use Docker to start RabbitMQ and PostgreSQL with the following commands. If you change the container names or ports, make sure to update the `.env` file accordingly:

```bash
# Start RabbitMQ
docker run -d --hostname my-rabbit --name some-rabbit -p 5672:5672 -p 15672:15672 -p 15692:15692 -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=1234 rabbitmq:3-management

# Start PostgreSQL
docker run --name some-postgres -e POSTGRES_PASSWORD=PASSWORD! -d -p 5432:5432 postgres
```

### Step 2: Start Each Service

Run the following commands in separate terminals:

```bash
# Auth Service
cd auth-service
yarn start:dev

# Video Service
cd ../video-service
yarn start:dev

# Upload Service
cd ../Upload-service
yarn start:dev

# API Gateway
cd ../api-gateway
yarn start:dev
```

---

## Common NestJS Commands

### Generate a New Module

```bash
nest g module <module-name>
```

### Generate a New Service

```bash
nest g service <service-name>
```

### Generate a New Controller

```bash
nest g controller <controller-name>
```

---

## Notes

- **Database Migrations**: Use Prisma to manage database schema. Follow these steps:

  1. Initialize Prisma in your project:

     ```bash
     yarn prisma init
     ```

  2. Update the `.env` file with the correct database connection string.

  3. Pull the existing database schema:

     ```bash
     yarn prisma db pull --schema src/prisma/schema.prisma
     ```

  4. Generate Prisma client:
     ```bash
     yarn prisma generate --schema src/prisma/schema.prisma
     ```

- **Code Formatting**: Use Prettier for consistent code formatting. Run `yarn format` to format the codebase.
  - To automatically format code on save or format actions, install the Prettier extension in your editor and set it as the default formatter.
- **Linting**: Use ESLint to ensure code quality. Run `yarn lint` to check for linting issues.

---


<!-- Test -->