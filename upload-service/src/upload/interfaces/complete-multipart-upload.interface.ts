export interface ICompleteMultipartUploadRequest {
  key: string;
  uploadId: string;
  parts: { ETag: string; PartNumber: number }[];
  idToken: string;
}
