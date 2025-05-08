# API Development Guidelines

This document outlines the standards and best practices for developing APIs within the API Gateway and related microservices (e.g., upload-service, auth-service). Following these guidelines ensures consistency, maintainability, and scalability across the codebase. Please adhere to these rules when contributing to the project.

## Table of Contents

1. [Project Overview](#project-overview)  
2. [API Response Structure](#api-response-structure)  
3. [Controller Standards](#controller-standards)  
4. [Microservice Integration](#microservice-integration)  
5. [Error Handling](#error-handling)  
6. [Logging](#logging)  
7. [Swagger Documentation](#swagger-documentation)  
8. [Testing APIs](#testing-apis)  
9. [Directory Structure](#directory-structure)  
10. [Additional Notes](#additional-notes)  

---

## Project Overview

- **API Gateway**: Built with NestJS, serves as the entry point for client requests, routing them to microservices via RabbitMQ.  
- **Microservices**: Include upload-service (handles file uploads to S3) and auth-service (manages authentication).  
- **Tech Stack**: NestJS, TypeScript, RabbitMQ, AWS S3/STS, JWT, Swagger.  
- **Port**: API Gateway runs on `http://localhost:8080/api`.  

The goal is to maintain a consistent API structure, robust error handling, and clear documentation for all endpoints.

---

## API Response Structure

### 1. Success Response (`GlobalResponse`)

Used for successful requests, defined in `src/shared/types/global-response.type.ts`:

```typescript
export interface GlobalResponse<T = any> {
  statusCode: number; // e.g., 200
  message: string;   // e.g., "Thành công"
  data: T | null;    // Response data
  meta?: any;        // Optional metadata (e.g., pagination)
}
```

**Example**:

```json
{
  "statusCode": 200,
  "message": "Tạo URL ký sẵn thành công",
  "data": {
    "presignedUrl": "https://...",
    "key": "uploads/user123/uuid",
    "bucketName": "your-bucket-name"
  },
  "meta": null
}
```

**Usage**:

```typescript
import { success } from '@/shared/utils/response.util';
return success(data, { message: 'Custom message', meta: { page: 1 } });
```

### 2. Error Response (`ErrorResponse`)

Used for error responses, defined in `src/shared/types/error-response.type.ts`:

```typescript
export interface ErrorResponse {
  statusCode: number; // e.g., 400, 500
  message: string;   // e.g., "Không thể xác thực ID token"
  error: string;     // e.g., "UnauthorizedException"
  timestamp: string; // ISO timestamp, e.g., "2025-04-26T12:00:00.000Z"
  path: string;      // API path, e.g., "/api/upload/presign-url"
}
```

**Example**:

```json
{
  "statusCode": 401,
  "message": "Không thể xác thực ID token",
  "error": "UnauthorizedException",
  "timestamp": "2025-04-26T12:00:00.000Z",
  "path": "/api/upload/presign-url"
}
```

**Usage**:

```typescript
import { fail } from '@/shared/utils/response.util';
return fail('Invalid input', 400);
```

---

## Controller Standards

### 1. Response Handling

- Always return `GlobalResponse` for successful responses using `success`.  
- Use `fail` for validation or business logic errors.  

**Example**:

```typescript
import { success, fail } from '@/shared/utils/response.util';
import { GlobalResponse } from '@/shared/types/global-response.type';

@Post('example')
async exampleEndpoint(@Body() dto: ExampleDto): Promise<GlobalResponse<any>> {
  if (!dto.requiredField) {
    return fail('Required field is missing', 400);
  }
  const result = await someServiceCall();
  return success(result, { message: 'Operation successful' });
}
```

### 2. Input Validation

- Use DTOs (Data Transfer Objects) for input validation.  
- Apply `ValidationPipe` with the following options:  

```typescript
@Body(new ValidationPipe({ transform: true }))
```

Define DTOs in `src/services/<service>/dto` using `class-validator` and `class-transformer`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class ExampleDto {
  @IsString()
  @IsNotEmpty()
  requiredField: string;
}
```

### 3. Logging

- Inject `LoggerService` (from `src/utils/logger.service.ts`) into controllers.  
- Log key events: request received, success, and errors.  

**Example**:

```typescript
import { LoggerService } from '@/utils/logger.service';

@Controller('example')
export class ExampleController {
  constructor(private readonly logger: LoggerService) {}

  @Post('endpoint')
  async endpoint() {
    this.logger.log('Received request for endpoint');
    try {
      const result = await someOperation();
      this.logger.log('Successfully processed endpoint');
      return success(result);
    } catch (error) {
      this.logger.error('Failed to process endpoint', { error });
      return fail('Operation failed', 500);
    }
  }
}
```

### 4. Module Configuration

Ensure the module provides `LoggerService` and `ClassSerializerInterceptor`:

```typescript
import { LoggerService } from '@/utils/logger.service';
import { Module } from '@nestjs/common';
import { ClassSerializerInterceptor, APP_INTERCEPTOR } from '@nestjs/common';

@Module({
  controllers: [ExampleController],
  imports: [RmqClientsModule],
  providers: [
    { provide: LoggerService, useValue: new LoggerService('ExampleGateway') },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class ExampleModule {}
```

---

## Microservice Integration

The API Gateway communicates with microservices (e.g., upload-service, auth-service) via RabbitMQ. Follow these guidelines:

### 1. Client Proxy Injection

Inject the `ClientProxy` for the microservice using `@Inject`:

```typescript
import { ClientProxy } from '@nestjs/microservices';

@Controller('example')
export class ExampleController {
  constructor(@Inject('EXAMPLE_SERVICE') private readonly client: ClientProxy) {}
}
```

### 2. Sending Messages

Use `client.send` with the correct message pattern and payload.  
Use `lastValueFrom` from `rxjs` to await the response.

**Example**:

```typescript
import { lastValueFrom } from 'rxjs';

async callMicroservice(dto: ExampleDto) {
  const result = await lastValueFrom(
    this.client.send('example_pattern', dto),
  );
  return success(result.data, { message: result.message });
}
```

---

## Error Handling

Errors are handled globally by `GlobalExceptionsFilter` (in `src/shared/filters/global-exception.filter.ts`).

### 1. Automatic Error Handling

All uncaught exceptions (e.g., `HttpException`, runtime errors) are caught and returned as `ErrorResponse`.

**Example**:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Error",
  "timestamp": "2025-04-26T12:00:00.000Z",
  "path": "/api/example/endpoint"
}
```

### 2. Manual Error Handling

For validation or business logic errors, use `fail`:

```typescript
if (!dto.idToken) {
  return fail('ID token is required', 400);
}
```

---

## Logging

Use `LoggerService` for all logging.  
Log at least:  
- Request received: Include relevant input (e.g., DTO fields).  
- Success: Log successful operations.  
- Errors: Log exceptions with stack traces.  

**Example**:

```typescript
this.logger.log('Received request', { dto });
this.logger.log('Operation successful');
this.logger.error('Operation failed', { error });
```

---

## Swagger Documentation

All endpoints must be documented using Swagger annotations from `@nestjs/swagger`.

### 1. Basic Annotations

Use `@ApiOperation` to describe the endpoint:

```typescript
@ApiOperation({ summary: 'Generate presigned URL for file upload' })
```

Use `@ApiResponse` to document response statuses:

```typescript
@ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
@ApiResponse({ status: 400, description: 'Invalid input' })
```

---

## Testing APIs

Use Postman to test all endpoints. Follow these steps:

### 1. Setup

- **Base URL**: `http://localhost:8080/api`  
- **Headers**: `Content-Type: application/json`  
- **Environment**:  
  - `idToken`: Valid JWT from auth-service.  
  - `file`: Test files (e.g., `test-video.mp4` for single upload, `large-video.mp4` for multipart).  

---

## Directory Structure

Follow this structure for new services:

```
src/
├── services/
│   ├── <service-name>/
│   │   ├── dto/                    # DTOs for validation
│   │   ├── <service>.controller.ts # API endpoints
│   │   ├── <service>.module.ts     # Module configuration
├── shared/
│   ├── filters/                    # Global exception filter
│   ├── interceptors/               # Response interceptor
│   ├── types/                      # Response types
│   ├── utils/                      # Logger, response utils
├── app.module.ts                   # Root module
├── main.ts                         # Application bootstrap
```

---

## Additional Notes

1. **Security**  
   - Protect `idToken` in requests.  
   - Regularly audit IAM roles and S3 bucket policies.  

2. **Performance**  
   - Use multipart upload for files >100MB.  

3. **Scalability**  
   - Integrate CloudFront for faster content delivery.  

4. **Code Reviews**  
   - Validate DTOs, logging, and Swagger documentation before merging.  

---

## Contact

For questions or clarification:  
- **Email**: your-email@example.com  
- **GitHub**: your-github-profile  
- **Slack**: #dev-team-channel  

Happy coding!
