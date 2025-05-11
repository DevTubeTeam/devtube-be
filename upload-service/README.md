# Upload Service

## Giới thiệu

`upload-service` là một microservice được xây dựng bằng NestJS, chịu trách nhiệm tạo presigned URLs để tải tệp lên Amazon S3 và hoàn tất quá trình tải nhiều phần (multipart upload). Dịch vụ sử dụng RabbitMQ để giao tiếp với API Gateway, tích hợp AWS STS để xác thực người dùng qua JWT token, và đảm bảo quyền truy cập an toàn vào S3.

## Chức năng chính

- **Tạo presigned URL**: Cho phép client tải tệp trực tiếp lên S3 (single hoặc multipart upload).
- **Hoàn tất multipart upload**: Kết hợp các phần của tệp lớn trên S3.
- **Xác thực người dùng**: Sử dụng `idToken` để xác minh qua `auth-service`.
- **Ghi log**: Theo dõi mọi thao tác để debug và giám sát.

## Công nghệ sử dụng

- **NestJS**: Framework Node.js cho microservice.
- **RabbitMQ**: Message queue để giao tiếp.
- **AWS S3**: Lưu trữ tệp.
- **AWS STS**: Cung cấp thông tin xác thực tạm thời.
- **JWT**: Xác thực người dùng.
- **TypeScript**: Đảm bảo type safety.

## Cấu trúc dự án

```
src/
├── upload/
│   ├── interfaces/              # Định nghĩa interface
│   ├── upload.controller.ts     # Xử lý message từ RabbitMQ
│   ├── upload.service.ts        # Logic chính của dịch vụ
│   ├── upload.module.ts         # Module NestJS
├── utils/
│   ├── logger.service.ts        # Dịch vụ ghi log
├── app.module.ts                # Module gốc
├── main.ts                      # Khởi động microservice
```

## Yêu cầu

- **Node.js**: v16 hoặc cao hơn.
- **RabbitMQ**: Server đang chạy.
- **AWS Account**: Với quyền truy cập S3 và STS.
- **Dependencies**:
  ```bash
  npm install @nestjs/core @nestjs/microservices @nestjs/config @aws-sdk/client-s3 @aws-sdk/client-sts @aws-sdk/s3-request-presigner rxjs jsonwebtoken uuid class-validator class-transformer
  ```

## Cấu hình

### File `.env`

Tạo file `.env` với các biến sau:

```
RABBITMQ_URL=amqp://user:pass@localhost:5672
RABBITMQ_QUEUE=upload-queue
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your-bucket-name
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/UploadServiceRole
AUTH_SERVICE_URL=amqp://user:pass@localhost:5672
AUTH_SERVICE_QUEUE=auth-queue
```

### Cấu hình AWS

#### Tạo S3 Bucket

- Tạo bucket (ví dụ: `your-bucket-name`) trong vùng `ap-south-1`.
- Cấu hình CORS:
  ```json
  [
    {
      "AllowedHeaders": ["Content-Type", "Authorization"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedOrigins": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

#### Tạo vai trò IAM

- **Chính sách vai trò**:

  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:CreateMultipartUpload", "s3:UploadPart", "s3:CompleteMultipartUpload"],
        "Resource": "arn:aws:s3:::your-bucket-name/uploads/*"
      }
    ]
  }
  ```

- **Trust relationship**:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "cognito-identity.amazonaws.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "cognito-identity.amazonaws.com:aud": "your-identity-pool-id"
          }
        }
      }
    ]
  }
  ```

#### Cấu hình bucket policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/UploadServiceRole"
      },
      "Action": ["s3:PutObject", "s3:CreateMultipartUpload", "s3:UploadPart", "s3:CompleteMultipartUpload"],
      "Resource": "arn:aws:s3:::your-bucket-name/uploads/*"
    }
  ]
}
```

## Cách sử dụng

### Chạy dịch vụ

1. **Cài đặt dependencies**:

   ```bash
   npm install
   ```

2. **Chạy RabbitMQ server** (nếu chưa chạy):

   ```bash
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

3. **Chạy microservice**:
   ```bash
   npm run start
   ```

### Test với Postman

#### Test Single Upload

1. **Tạo presigned URL**:

   - **Phương thức**: POST
   - **URL**: `http://localhost:3000/upload/presign-url`
   - **Headers**: `Content-Type: application/json`
   - **Body**:
     ```json
     {
       "fileName": "test-video.mp4",
       "fileType": "video/mp4",
       "idToken": "your-jwt-token",
       "fileSize": 10485760
     }
     ```

2. **Tải tệp lên S3**:
   - **Phương thức**: PUT
   - **URL**: presignedUrl từ bước trên.
   - **Headers**: `Content-Type: video/mp4`
   - **Body**: Chọn file `test-video.mp4` (binary).

#### Test Multipart Upload

1. **Tạo presigned URLs**:

   - **Phương thức**: POST
   - **URL**: `http://localhost:3000/upload/presign-url`
   - **Body**:
     ```json
     {
       "fileName": "large-video.mp4",
       "fileType": "video/mp4",
       "idToken": "your-jwt-token",
       "fileSize": 157286400
     }
     ```

2. **Tải từng phần**:

   - Chia file: `split -b 5m large-video.mp4 part-`
   - Với mỗi `presignedUrls[i]`:
     - **Phương thức**: PUT
     - **URL**: `presignedUrls[i]`
     - **Headers**: `Content-Type: video/mp4`
     - **Body**: Chọn file phần (ví dụ: `part-aa`).

3. **Hoàn tất multipart upload**:
   - **Phương thức**: POST
   - **URL**: `http://localhost:3000/upload/complete-multipart-upload`
   - **Body**:
     ```json
     {
       "key": "uploads/user123/uuid",
       "uploadId": "your-upload-id",
       "parts": [
         { "ETag": "\"hash1\"", "PartNumber": 1 },
         { "ETag": "\"hash2\"", "PartNumber": 2 }
       ],
       "idToken": "your-jwt-token"
     }
     ```



## Liên hệ

- **Email**: devtube-team
- **GitHub**: devtube-team
