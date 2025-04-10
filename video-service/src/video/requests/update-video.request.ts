export class UpdateVideoRequest  {
    id: string;
    updateData: {
        title?: string;
        description?: string;
        video_url?: string;
        thumbnail_url?: string;
        duration?: number;
        user_id?: string;
        privacy?: 'public' | 'private' | 'unlisted';
        status?: 'processing' | 'ready' | 'failed';
    };
}
