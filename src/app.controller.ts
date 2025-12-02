import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  getHealth(): object {
    return { ok: true, message: 'Servidor funcionando correctamente 🚀' };
  }
}
