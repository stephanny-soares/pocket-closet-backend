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
      //const urlPublica = `https://storage.googleapis.com/${this.bucketName}/${nombreArchivo}`;

      const [urlFirmada] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
      });
// ✅ URL con firma temporal → Google Vision puede acceder

      console.log(`Archivo subido: ${urlFirmada}`);
      return urlFirmada;
    } catch (error) {
      console.error('Error subiendo archivo a Storage:', error);
      throw error;
    }
  }
  

  /**
   * Leer archivo de GCS como Base64 (para Vision API)
   */
  async leerArchivoComoBase64(urlArchivo: string): Promise<string> {
    try {
      // Extraer el nombre del archivo de la URL
      const nombreArchivo = urlArchivo.split(`/${this.bucketName}/`)[1]?.split('?')[0];

      if (!nombreArchivo) {
        throw new Error('No se pudo extraer el nombre del archivo');
      }

      const bucket = this.storage.bucket(this.bucketName);
      const [contenido] = await bucket.file(nombreArchivo).download();
      
      const base64 = contenido.toString('base64');
      console.log(`✅ Base64 generado: ${nombreArchivo} (${base64.length} chars)`);
      
      return base64;
    } catch (error) {
      console.error('❌ Error leyendo archivo como Base64:', error);
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