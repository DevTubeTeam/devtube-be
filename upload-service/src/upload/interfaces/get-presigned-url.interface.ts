export interface IGetPresignedUrl {
  fileName: string;
  fileType: string;
  idToken: string;
}

export interface IGetPresignedUrlResponse {
  presignedUrl: string;
  key: string;
  bucketName: string;
}
