import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { JwtPayload } from './types/jwt-payload.interface';

@Injectable()
// Esta clase define la estrategia JWT usada por el sistema de autenticación
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // Indicamos cómo se extrae el token JWT (del header Authorization)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Secreto usado para firmar los tokens (mismo que en JwtModule)
      secretOrKey: process.env.JWT_SECRET || 'secretkey',
    });
  }

  /**
   * Este método se ejecuta automáticamente cuando el token es válido.
   * Recibe el "payload" (contenido del token) y debe devolver un usuario válido.
   */
  async validate(payload: JwtPayload) {
    // payload contiene los datos que guardamos al generar el token, por ejemplo:
    // { id: '123', email: 'usuario@correo.com' }

    const usuario = await this.authService.validarUsuarioPorId(payload.id);

    if (!usuario) {
      // Si no se encuentra el usuario, se lanza un error de autorización
      throw new UnauthorizedException('Token inválido o usuario no encontrado');
    }

    // Si el token y el usuario son válidos, devolvemos el usuario
    return usuario;
  }
}
