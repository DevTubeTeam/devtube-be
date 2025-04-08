CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM: user role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END$$;

-- DROP nếu cần reset
DROP TABLE IF EXISTS users;

-- CREATE TABLE users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Thông tin từ Google
    display_name TEXT NOT NULL,                  -- ✅ Tên hiển thị
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT false,        -- ✅ NEW
    avatar_url TEXT,                             -- ✅ NEW
    locale TEXT,                                 -- ✅ Optional
    oauth_provider TEXT NOT NULL,                -- 'google', 'github', etc.
    oauth_id TEXT NOT NULL,                      -- ID của người dùng trên provider

    -- Token & phân quyền
    role user_role DEFAULT 'user',               -- ✅ Role
    hashed_refresh_token TEXT,                   -- ✅ Để lưu refreshToken an toàn

    -- Metadata & thời gian
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,

    -- Ràng buộc
    UNIQUE (oauth_provider, oauth_id)
);

CREATE TYPE vid_privacy AS ENUM ('public', 'private', 'unlisted');
CREATE TYPE vid_status AS ENUM ('processing', 'ready', 'failed');

DROP TABLE IF EXISTS videos;
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL, -- Cloud storage URL S3
    thumbnail_url TEXT NOT NULL, -- Cloud storage URL S3
    duration INT NOT NULL, -- In seconds
    views BIGINT DEFAULT 0,
    privacy vid_privacy DEFAULT 'public',
    status vid_status DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
    id bigint generated always as identity primary key,
    video_id UUID,
    user_id UUID,
    content TEXT NOT NULL, -- Maybe rich text
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS likes;
CREATE TABLE likes (
    id bigint generated always as identity primary key,
    user_id UUID,
    video_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, video_id)
);

-- Thêm bảng revoked_tokens
DROP TABLE IF EXISTS revoked_tokens;
CREATE TABLE revoked_tokens (
    id BIGSERIAL PRIMARY KEY,                    -- ID duy nhất
    jti TEXT,                                    -- JWT ID (nếu sử dụng JWT)
    user_id UUID,                                -- ID của người dùng
    token_type TEXT NOT NULL,                    -- 'access' hoặc 'refresh'
    expires_at TIMESTAMP NOT NULL,               -- Thời gian hết hạn của token
    revoked_at TIMESTAMP DEFAULT NOW()           -- Thời gian token bị thu hồi
);
