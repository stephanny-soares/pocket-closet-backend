import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { GoogleLoginDto } from '../dto/google-login.dto';

@Injectable()
export class OAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_OAUTH_WEB_ID,
      process.env.GOOGLE_OAUTH_WEB_SECRET,
    );
  }

  // Validar token de Google
  async verifyGoogleToken(googleLoginDto: GoogleLoginDto) {
    const token = googleLoginDto.id_token || googleLoginDto.access_token;

    if (!token) throw new Error('Token requerido');

    try {
      // Intenta validar con idToken
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_OAUTH_WEB_ID,
      });

      const payload = ticket.getPayload();
      return {
        email: payload?.email,
        name: payload?.name,
        googleId: payload?.sub,
      };
    } catch (error) {
      // Si falla, intenta con accessToken (web)
      const userinfo: any = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ).then((r) => r.json());

      return {
        email: userinfo.email,
        name: userinfo.name,
        googleId: userinfo.id,
      };
    }
  }

  // Validar token de Apple
  async verifyAppleToken(idToken: string) {
    try {
      // Decodificar sin verificar primero (para obtener el kid)
      const decoded: any = jwt.decode(idToken, { complete: true });
      const kid = decoded?.header?.kid;

      // Obtener las claves públicas de Apple
      const response = await fetch('https://appleid.apple.com/auth/keys');
      const data: any = await response.json();

      // Encontrar la clave correcta
      const key = data.keys.find((k: any) => k.kid === kid);
      if (!key) throw new Error('Clave no encontrada');

      // Construir la clave pública
      const publicKey = crypto.createPublicKey({
        key: {
          kty: key.kty,
          n: key.n,
          e: key.e,
        },
        format: 'jwk',
      });

      // Verificar el token
      const payload: any = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
      });

      return {
        email: payload.email,
        name: payload.name || 'Usuario Apple',
        appleId: payload.sub, // ID único de Apple
      };
    } catch (error) {
      throw new Error('Token de Apple inválido');
    }
  }
}
