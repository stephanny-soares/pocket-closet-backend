import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prenda } from '../../entities/prenda.entity';
import { User } from '../../entities/user.entity';
import { CreatePrendaDto } from './dto/create-prenda.dto';
import { UpdatePrendaDto } from './dto/update-prenda.dto';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class PrendasService {
  private geminiApiKey: string;

  constructor(
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
    private readonly servicioAlmacenamiento: StorageService,
  ) {
    this.geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
  }

  /**
   * Clasificar prenda desde archivo SIN guardar en BD
   * Devuelve la clasificación para que el usuario confirme
   */
  async clasificarPrendaDesdeArchivo(
    archivo: Express.Multer.File,
    datosAdicionales: any,
    usuario: User,
  ): Promise<{
    urlImagen: string;
    clasificacion: any;
  }> {
    try {
      // Validar que sea imagen
      if (!archivo.mimetype.startsWith('image/')) {
        throw new BadRequestException('El archivo debe ser una imagen');
      }

      // Subir a Google Cloud Storage
      const urlImagen = await this.servicioAlmacenamiento.subirArchivo(archivo);
      console.log('✅ Imagen subida a Storage');

      // Convertir a base64
      const base64 =
        await this.servicioAlmacenamiento.leerArchivoComoBase64(urlImagen);

      // Clasificar con Gemini
      const clasificacion = await this.clasificarImagen(base64);
      console.log('✅ Clasificación recibida:', clasificacion);

      // Devolver clasificación + URL de imagen (SIN crear en BD)
      return {
        urlImagen,
        clasificacion,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Error al procesar archivo: ${error.message}`,
      );
    }
  }

  /**
   * Crear prenda desde archivo subido (desde móvil/dispositivo)
   */
  async crearPrendaDesdeArchivo(
    archivo: Express.Multer.File,
    datosAdicionales: any,
    usuario: User,
  ): Promise<Prenda> {
    try {
      // Validar que sea imagen
      if (!archivo.mimetype.startsWith('image/')) {
        throw new BadRequestException('El archivo debe ser una imagen');
      }

      // Subir a Google Cloud Storage
      const urlImagen = await this.servicioAlmacenamiento.subirArchivo(archivo);
      console.log('✅ Imagen subida a Storage');

      // Convertir a base64
      const base64 =
        await this.servicioAlmacenamiento.leerArchivoComoBase64(urlImagen);

      // Clasificar con Gemini
      const clasificacion = await this.clasificarImagen(base64);
      console.log('✅ Clasificación recibida:', clasificacion);

      // Crear prenda en BD
      const prenda = this.prendaRepository.create({
        nombre: clasificacion.nombre,
        tipo: clasificacion.tipo,
        color: clasificacion.color,
        imagen: urlImagen,
        marca: datosAdicionales.marca || '',
        ocasion: clasificacion.ocasion,
        estacion: clasificacion.estacion,
        seccion: clasificacion.seccion,
        usuario,
        metadatos: {
          procesadoPor: 'Gemini',
          subidoDesde: 'Dispositivo',
        },
      });

      return await this.prendaRepository.save(prenda);
    } catch (error: any) {
      throw new BadRequestException(
        `Error al procesar archivo: ${error.message}`,
      );
    }
  }

  /**
   * Analizar imagen desde URL/base64 y crear prenda (endpoint /api/prendas POST)
   */
  async crearPrendaDesdeImagen(
    crearPrendaDto: CreatePrendaDto,
    usuario: User,
  ): Promise<Prenda> {
    try {
      if (!crearPrendaDto.imagen) {
        throw new BadRequestException('La imagen es obligatoria');
      }

      // ❗ NO CLASIFICAMOS AQUÍ
      // Los datos vienen YA clasificados desde /upload

      const prenda = this.prendaRepository.create({
        nombre: crearPrendaDto.nombre,
        tipo: crearPrendaDto.tipo,
        color: crearPrendaDto.color,
        imagen: crearPrendaDto.imagen,
        marca: crearPrendaDto.marca || '',
        ocasion: crearPrendaDto.ocasion,
        estacion: crearPrendaDto.estacion,
        usuario,
        metadatos: {
          procesadoPor: 'Gemini',
          origen: 'Clasificación previa en /upload',
        },
      });

      return await this.prendaRepository.save(prenda);
    } catch (error: any) {
      throw new BadRequestException(
        `Error al crear prenda: ${error.message}`,
      );
    }
  }


  /**
   * Clasificar imagen con Gemini (fetch directo a API)
   */
  private async clasificarImagen(base64: string): Promise<any> {
    try {
      console.log('🔍 === INICIANDO CLASIFICACIÓN CON GEMINI ===');

      const prompt = `Analiza esta imagen de una prenda de ropa y devuelve SOLO un JSON válido (sin markdown, sin explicaciones).

{
  "nombre": "color + tipo (ej: Rosa Pantalón)",
  "tipo": "pantalón",
  "color": "rosa",
  "estacion": "verano",
  "ocasion": "casual",
  "seccion": "inferior"
}`;

      console.log('📤 Enviando a Gemini API.');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: base64,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Error de Gemini:', errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta recibida de Gemini');

      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('📝 Contenido:', responseText.substring(0, 200));

      // Intentar extraer un JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No se encontró JSON en la respuesta');
        console.error('Respuesta completa:', responseText);
        return this.clasificacionPorDefecto();
      }

      const clasificacion = JSON.parse(jsonMatch[0]);
      console.log('✅ Clasificación exitosa:', clasificacion);

      return clasificacion;
    } catch (error: any) {
      console.error('❌ ERROR en clasificarImagen:', error.message);
      return this.clasificacionPorDefecto();
    }
  }

  /**
   * Clasificación por defecto si falla Gemini
   */
  private clasificacionPorDefecto(): any {
    return {
      nombre: 'Prenda',
      tipo: 'camiseta',
      color: 'azul',
      estacion: 'todas',
      ocasion: 'casual',
      seccion: 'superior',
    };
  }

  /**
   * Obtener prendas filtradas por sección
   */
  async obtenerPrendasPorSeccion(
    usuario: User,
    seccion: string,
  ): Promise<Prenda[]> {
    const prendas = await this.prendaRepository.find({
      where: { usuario: { id: usuario.id } },
    });

    return prendas.filter((p) => p.seccion === seccion.toLowerCase());
  }

  /**
   * Obtener todas las prendas del usuario
   */
  async obtenerPrendas(usuario: User): Promise<Prenda[]> {
    return await this.prendaRepository.find({
      where: { usuario: { id: usuario.id } },
      order: { createdAt: 'DESC' }, // 👈 usamos "order", NO "orderBy"
    });
  }

  /**
   * Obtener prenda por ID
   */
  async obtenerPrendaPorId(id: string, usuario: User): Promise<Prenda> {
    const prenda = await this.prendaRepository.findOne({
      where: { id, usuario: { id: usuario.id } },
    });

    if (!prenda) {
      throw new BadRequestException('Prenda no encontrada');
    }

    return prenda;
  }

  /**
   * Actualizar prenda
   */
  async actualizarPrenda(
    id: string,
    actualizarPrendaDto: UpdatePrendaDto,
    usuario: User,
  ): Promise<Prenda> {
    const prenda = await this.obtenerPrendaPorId(id, usuario);
    Object.assign(prenda, actualizarPrendaDto);
    return await this.prendaRepository.save(prenda);
  }

  /**
   * Eliminar prenda
   */
  async eliminarPrenda(id: string, usuario: User): Promise<void> {
    const prenda = await this.obtenerPrendaPorId(id, usuario);
    await this.prendaRepository.remove(prenda);
  }
}
