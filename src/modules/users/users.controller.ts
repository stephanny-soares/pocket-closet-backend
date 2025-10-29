import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async obtenerUsuarios() {
    const usuarios = await this.usersService.obtenerUsuarios();
    return { ok: true, usuarios };
  }

   @Post()
  async crearUsuario(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    const usuario = await this.usersService.crearUsuario(name, email, password);
    // no devolver el password_hash por seguridad
    const { password_hash, ...safe } = usuario as any;
    return { ok: true, usuario: safe };
  }
}
