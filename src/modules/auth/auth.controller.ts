import { Body, Controller, Post, HttpException, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Req() req: Express.Request) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.register(createUserDto, correlationId);
      return result;
    } catch (error) {
      throw new HttpException({ ok: false, error: error.message }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Express.Request) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.login(loginDto, correlationId);
      return result;
    } catch (error) {
      throw new HttpException({ ok: false, error: error.message }, HttpStatus.BAD_REQUEST);
    }
  }
}
