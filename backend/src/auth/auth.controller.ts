import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, PinSwitchDto } from './auth.dto';
import { JwtAuthGuard, AuthUser } from '../common/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('pin-switch')
  @UseGuards(JwtAuthGuard)
  pinSwitch(@Body() dto: PinSwitchDto, @Request() req: { user: AuthUser }) {
    return this.auth.pinSwitch(req.user, dto.pin);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: { user: AuthUser }) {
    return this.auth.getProfile(req.user.id);
  }
}
