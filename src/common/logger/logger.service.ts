import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    // Carpeta de logs en la raíz del proyecto
    const logDir = path.join(process.cwd(), 'logs'); // process.cwd() apunta a la raíz
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

    const formato = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    );

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: formato,
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10,
          zippedArchive: true,
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          level: 'info',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10,
          zippedArchive: true,
        }),
      ],
    });
  }

  info(message: any) {
    this.logger.info(message);
  }

  warn(message: any) {
    this.logger.warn(message);
  }

  error(message: any) {
    this.logger.error(message);
  }
}
