import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    (req as any).correlationId = correlationId; // asignamos al req

    this.logger.info({
      event: 'RequestReceived',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      correlationId,
    });

    next();
  }
}
