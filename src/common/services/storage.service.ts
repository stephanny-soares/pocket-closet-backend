import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucketName: string = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'pocketcloset-prendas';

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_VISION_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  /**
   * Subir archivo a Google Cloud Storage
   */
  async subirArchivo(
    archivo: Express.Multer.File,
    carpeta: string = 'prendas',
  ): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const nombreArchivo = `${carpeta}/${timestamp}-${archivo.originalname}`;

      const file = bucket.file(nombreArchivo);

      // Subir archivo
      await file.save(archivo.buffer, {
        metadata: {
          contentType: archivo.mimetype,
        },
      });


      // Generar URL pública
      const urlPublica = `https://storage.googleapis.com/${this.bucketName}/${nombreArchivo}`;

      console.log(`Archivo subido: ${urlPublica}`);
      return urlPublica;
    } catch (error) {
      console.error('Error subiendo archivo a Storage:', error);
      throw error;
    }
  }

  /**
   * Eliminar archivo de Google Cloud Storage
   */
  async eliminarArchivo(urlArchivo: string): Promise<void> {
    try {
      // Extraer el nombre del archivo de la URL
      const nombreArchivo = urlArchivo.split(`/${this.bucketName}/`)[1];

      if (!nombreArchivo) {
        console.warn('No se pudo extraer el nombre del archivo:', urlArchivo);
        return;
      }

      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(nombreArchivo).delete();

      console.log(`Archivo eliminado: ${nombreArchivo}`);
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      // No lanzar error, solo loguear
    }
  }
}