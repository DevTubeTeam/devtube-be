// src/video/dto/create-video.dto.ts
export class CreateVideoDto {
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url: string;
    duration: number;
    user_id?: string;
    privacy?: 'public' | 'private' | 'unlisted';
    status?: 'processing' | 'ready' | 'failed';
}

