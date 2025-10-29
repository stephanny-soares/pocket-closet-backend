import { Body, Controller, Post, HttpException, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Req() req: Express.Request) {
    try {
      // El middleware ya genera o propaga el correlationId
      const correlationId = (req as any).correlationId || null;

      // Lo pasamos al servicio
      const result = await this.authService.register(createUserDto, correlationId);
      return result;
    } catch (error) {
      throw new HttpException({ ok: false, error: error.message }, HttpStatus.BAD_REQUEST);
    }
  }
}
