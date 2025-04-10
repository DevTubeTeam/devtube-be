export class FindAllVideoRequest  {
    skip?: number;
    take?: number;
    user_id?: string;
    privacy?: 'public' | 'private' | 'unlisted';
    status?: 'processing' | 'ready' | 'failed';
    search?: string;
}
