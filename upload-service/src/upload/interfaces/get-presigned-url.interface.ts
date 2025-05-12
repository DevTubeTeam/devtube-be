export interface IPresignedUrlRequest {
  fileName: string;
  fileType: string;
  idToken: string;
  fileSize: number;
  userId: string;
}

export interface ISinglePresignedUrlResponse {
  presignedUrl: string;
  key: string;
  bucketName: string;
}

export interface IMultipartPresignedUrlResponse {
  uploadId: string;
  key: string;
  bucketName: string;
  presignedUrls: string[];
}
