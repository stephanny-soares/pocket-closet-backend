import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private readonly logger: LoggerService) {}

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });

    this.client.on('error', (err) => {
      this.logger.error({
        event: 'RedisConnectionError',
        message: err.message,
      });
    });

    await this.client.connect();
    this.logger.info({
      event: 'RedisConnected',
      message: 'Conectado a Redis exitosamente',
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  /**
   * Obtener valor de Redis
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Guardar valor en Redis con expiración
   */
  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setEx(key, seconds, value);
  }

  /**
   * Incrementar contador
   */
  async increment(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  /**
   * Setear expiración en segundos
   */
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /**
   * Obtener TTL de una key
   */
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  /**
   * Eliminar key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Guardar token de recuperación de contraseña
   * PC-145: Reset password
   */
  async saveResetToken(
    email: string,
    token: string,
    expiresInSeconds: number = 900, // 15 minutos por defecto
  ): Promise<void> {
    const key = `reset_token:${email}`;
    await this.setEx(key, expiresInSeconds, token);
  }

  /**
   * Obtener token de recuperación de contraseña
   * PC-145: Reset password
   */
  async getResetToken(email: string): Promise<string | null> {
    const key = `reset_token:${email}`;
    return await this.get(key);
  }

  /**
   * Eliminar token de recuperación de contraseña
   * PC-145: Reset password
   */
  async deleteResetToken(email: string): Promise<void> {
    const key = `reset_token:${email}`;
    await this.del(key);
  }
}
