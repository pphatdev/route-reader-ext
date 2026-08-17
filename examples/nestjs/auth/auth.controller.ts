import { Controller, Post, Get, Body } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return { token: 'jwt', email: body.email };
  }

  @Post('logout')
  logout() {
    return { ok: true };
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return { token: 'jwt', refresh: body.refreshToken };
  }

  @Get('me')
  me() {
    return { id: 1, email: 'me@example.com' };
  }
}
