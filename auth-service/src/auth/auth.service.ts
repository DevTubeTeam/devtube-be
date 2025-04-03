import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService, // Inject PrismaService vào AuthService
  ) {}

  async handleGoogleCallback(code: string): Promise<any> {
    try {
      // Trao đổi mã code để lấy access token (giả sử bạn có một hàm để làm điều này)
      const accessToken = await this.exchangeCodeForAccessToken(code);

      // Lấy thông tin người dùng từ Google bằng access token
      const userInfo = await this.getUserInfoFromGoogle(accessToken);

      // Lưu hoặc cập nhật thông tin người dùng vào database
      const user = await this.prismaService.users.upsert({
        where: { email: userInfo.email },
        update: { display_name: userInfo.name, oauth_id: userInfo.id },
        create: {
          email: userInfo.email,
          display_name: userInfo.name,
          oauth_id: userInfo.id,
          oauth_provider: 'google',
        },
      });

      return user;
    } catch (error) {
      throw new Error('Error handling Google callback: ' + error.message);
    }
  }

  private async exchangeCodeForAccessToken(code: string): Promise<string> {
    // Logic để trao đổi mã code lấy access token từ Google
    // Ví dụ: Gửi HTTP request đến Google OAuth endpoint
    return 'mockAccessToken'; // Thay bằng logic thực tế
  }

  private async getUserInfoFromGoogle(accessToken: string): Promise<any> {
    // Logic để lấy thông tin người dùng từ Google bằng access token
    // Ví dụ: Gửi HTTP request đến Google API
    return {
      id: 'mockGoogleId',
      email: 'mockEmail@gmail.com',
      name: 'Mock User',
    }; // Thay bằng logic thực tế
  }
}
