export interface ICompleteMultipartUploadRequest {
  key: string;
  uploadId: string;
  parts: { ETag: string; PartNumber: number }[];
  idToken: string;
}


export interface IAbortMultipartUploadRequest {
  key: string;
  uploadId: string;
  idToken: string;
}


export interface IDeleteObjectDataRequest {
  key: string;
  idToken: string;
}