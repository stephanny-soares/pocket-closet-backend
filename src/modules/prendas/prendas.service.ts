import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prenda } from '../../entities/prenda.entity';
import { User } from '../../entities/user.entity';
import { CreatePrendaDto } from './dto/create-prenda.dto';
import { UpdatePrendaDto } from './dto/update-prenda.dto';
import vision from '@google-cloud/vision';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class PrendasService {
  private gcpProjectId: string;
  private clienteVision: any;

  constructor(
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
    private readonly servicioAlmacenamiento: StorageService,
  ) {
    this.gcpProjectId = process.env.GOOGLE_CLOUD_VISION_PROJECT_ID || '';
    this.clienteVision = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  /**
   * Analizar imagen con Google Cloud Vision y crear prenda
   */
  async crearPrendaDesdeImagen(
    crearPrendaDto: CreatePrendaDto,
    usuario: User,
  ): Promise<Prenda> {
    try {
      // Llamar a Google Cloud Vision para clasificación
      const etiquetas = await this.clasificarImagen(crearPrendaDto.imagen);
      console.log('Etiquetas recibidas:', etiquetas);

      // Extraer información
      const tipo = this.extraerTipo(etiquetas);
      const color = this.extraerColor(etiquetas);
      const seccion = this.extraerSeccion(tipo);
      const nombre = this.generarNombre(tipo, color);

      // Crear prenda en BD
      const prenda = this.prendaRepository.create({
        nombre: crearPrendaDto.nombre || nombre,
        tipo: crearPrendaDto.tipo || tipo,
        color: crearPrendaDto.color || color,
        seccion: seccion,
        imagen: crearPrendaDto.imagen,
        marca: crearPrendaDto.marca,
        ocasion: crearPrendaDto.ocasion,
        estacion: crearPrendaDto.estacion,
        usuario,
        metadatos: {
          etiquetas: etiquetas,
          procesadoPor: 'GoogleCloudVision',
        },
      });

      return await this.prendaRepository.save(prenda);
    } catch (error) {
      throw new BadRequestException(
        `Error al procesar imagen: ${error.message}`,
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

      // Subir a Google Cloud Storage (con URL firmada)
      const urlImagen = await this.servicioAlmacenamiento.subirArchivo(archivo);

      // Clasificar imagen con Google Vision
      const etiquetas = await this.clasificarImagen(urlImagen);
      console.log('Etiquetas recibidas:', etiquetas);

      // Extraer información
      const tipo = this.extraerTipo(etiquetas);
      const color = this.extraerColor(etiquetas);
      const seccion = this.extraerSeccion(tipo);
      const nombre = this.generarNombre(tipo, color);

      // Crear prenda en BD
      const prenda = this.prendaRepository.create({
        nombre: nombre,
        tipo: tipo,
        color: color,
        imagen: urlImagen,
        marca: datosAdicionales.marca,
        ocasion: datosAdicionales.ocasion,
        estacion: datosAdicionales.estacion,
        seccion: seccion,
        usuario,
        metadatos: {
          etiquetas: etiquetas,
          procesadoPor: 'GoogleCloudVision',
          subidoDesde: 'Dispositivo',
        },
      });

      return await this.prendaRepository.save(prenda);
    } catch (error) {
      throw new BadRequestException(
        `Error al procesar archivo: ${error.message}`,
      );
    }
  }

  /**
   * Clasificar imagen usando Google Cloud Vision (Etiquetas + Propiedades de Imagen)
   */
  private async clasificarImagen(imagenEntrada: string): Promise<any[]> {
    try {
      console.log('🔍 === INICIANDO CLASIFICACIÓN ===');
      console.log('📥 Tipo de entrada:', imagenEntrada.startsWith('data:image') ? 'Base64' : 'URL');

      let solicitud: any;

      // Manejar imagen base64 o URL
      if (imagenEntrada.startsWith('data:image')) {
        console.log('📝 Procesando Base64...');
        const datosBase64 = imagenEntrada.split(',')[1];
        solicitud = {
          image: { content: datosBase64 },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'IMAGE_PROPERTIES' },
          ],
        };
      } else {
        console.log('🌐 Procesando URL:', imagenEntrada.substring(0, 80) + '...');
        solicitud = {
          image: { source: { imageUri: imagenEntrada } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'IMAGE_PROPERTIES' },
          ],
        };
      }

      console.log('📤 Enviando a Google Cloud Vision...');
      const [resultado] = await this.clienteVision.annotateImage(solicitud);

      // Etiquetas (objetos detectados)
      const etiquetas = resultado.labelAnnotations || [];
      console.log(`✅ Etiquetas: ${etiquetas.length} encontradas`);

      // Colores dominantes
      const colores = resultado.imagePropertiesAnnotation?.dominantColors?.colors || [];
      console.log(`🎨 Colores dominantes: ${colores.length} encontrados`);

      if (colores.length > 0) {
        console.log(
          '🌈 Colores RGB:',
          colores
            .slice(0, 3)
            .map(
              (c) =>
                `rgb(${c.color?.red || 0}, ${c.color?.green || 0}, ${c.color?.blue || 0}) - ${(c.pixelFraction * 100).toFixed(1)}%`,
            )
            .join(', '),
        );
      }

      // Combinar etiquetas con colores detectados
      const todasLasEtiquetas = etiquetas.map((etiqueta) => ({
        etiqueta: etiqueta.description,
        puntuacion: etiqueta.score,
      }));

      // Agregar el color dominante como primera etiqueta
      if (colores.length > 0) {
        const etiquetaColor = this.rgbANombreColor(colores[0].color);
        if (etiquetaColor) {
          todasLasEtiquetas.unshift({
            etiqueta: etiquetaColor,
            puntuacion: colores[0].pixelFraction || 0.5,
          });
          console.log(`🏷️  Color detectado: ${etiquetaColor}`);
        }
      }

      return todasLasEtiquetas;
    } catch (error: any) {
      console.error('❌ ERROR CRÍTICO en clasificarImagen:');
      console.error('   Mensaje:', error.message);
      console.error('   Código:', error.code);
      console.error('   Stack:', error.stack);
      return this.clasificacionPorDefecto();
    }
  }

  /**
   * Convertir RGB a nombre de color en español
   */
  private rgbANombreColor(rgb: any): string {
    if (!rgb) return '';

    const r = rgb.red || 0;
    const g = rgb.green || 0;
    const b = rgb.blue || 0;

    // Normalizar valores a rango 0-255
    const maxRGB = Math.max(r, g, b);
    const minRGB = Math.min(r, g, b);

    // Si es un color muy claro (casi blanco)
    if (maxRGB > 200 && (maxRGB - minRGB) < 50) {
      return 'blanco';
    }

    // Si es un color muy oscuro (casi negro)
    if (maxRGB < 80) {
      return 'negro';
    }

    // Si todos los valores están cerca (gris)
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30) {
      return 'gris';
    }

    // Detectar color por dominancia
    if (r > g && r > b) {
      if (r > 180 && g > 100) {
        return 'naranja';
      }
      if (r > 150 && g < 80 && b < 80) {
        return 'rojo';
      }
      if (r > 200 && g > 150 && b < 100) {
        return 'amarillo';
      }
      if (r > 150 && g < 100 && b > 100) {
        return 'rosa';
      }
      if (r > 100 && g < 80 && b < 80) {
        return 'marrón';
      }
    } else if (g > r && g > b) {
      return 'verde';
    } else if (b > r && b > g) {
      if (b > 180 && (r + g) < 100) {
        return 'azul';
      }
      if (r > 100 && g < 80 && b > 150) {
        return 'púrpura';
      }
    }

    return 'azul'; // Fallback
  }

  /**
   * Clasificación por defecto si falla Google Cloud Vision
   */
  private clasificacionPorDefecto(): any[] {
    return [
      { etiqueta: 'ropa', puntuacion: 0.9 },
      { etiqueta: 'camiseta', puntuacion: 0.8 },
    ];
  }

  /**
   * Extraer tipo de prenda de las etiquetas de Google Vision
   * Google devuelve en inglés, aquí traducimos a español
   */
  private extraerTipo(etiquetas: any[]): string {
    // Mapa de traducción: inglés → español
    const traducciones: { [key: string]: string } = {
      // Camisas y tops
      'shirt': 'camiseta',
      't-shirt': 'camiseta',
      'active shirt': 'camiseta deportiva',
      'sports uniform': 'uniforme deportivo',
      'jersey': 'jersey',
      'sweater': 'suéter',
      'hoodie': 'sudadera',
      'jacket': 'chaqueta',
      'coat': 'abrigo',
      'blazer': 'blazer',
      // Pantalones
      'pants': 'pantalón',
      'jeans': 'jeans',
      'shorts': 'shorts',
      'skirt': 'falda',
      'leggings': 'leggings',
      // Vestidos
      'dress': 'vestido',
      'gown': 'vestido de gala',
      // Calzado
      'shoes': 'zapatos',
      'boots': 'botas',
      'sneakers': 'zapatillas',
      'sandals': 'sandalias',
      'heels': 'tacones',
      // Accesorios
      'hat': 'sombrero',
      'cap': 'gorra',
      'bag': 'bolso',
      'scarf': 'bufanda',
      'tie': 'corbata',
      'gloves': 'guantes',
    };

    // Buscar en las etiquetas de Google Vision
    for (const item of etiquetas) {
      const descripcion = (item.etiqueta || item.label || '').toLowerCase();
      
      // Buscar coincidencias exactas o parciales
      for (const [palabraIngles, palabraEspanola] of Object.entries(traducciones)) {
        if (descripcion.includes(palabraIngles)) {
          return palabraEspanola;
        }
      }
    }

    return 'camiseta'; // Valor por defecto
  }

  /**
   * Extraer color de las etiquetas de Google Vision
   * Google devuelve en inglés, aquí traducimos a español
   */
  private extraerColor(etiquetas: any[]): string {
    // Mapa de traducción: inglés → español
    const traducciones: { [key: string]: string } = {
      'red': 'rojo',
      'blue': 'azul',
      'green': 'verde',
      'yellow': 'amarillo',
      'black': 'negro',
      'white': 'blanco',
      'gray': 'gris',
      'grey': 'gris',
      'pink': 'rosa',
      'purple': 'púrpura',
      'violet': 'violeta',
      'orange': 'naranja',
      'brown': 'marrón',
      'maroon': 'granate',
      'navy': 'azul marino',
      'turquoise': 'turquesa',
      'beige': 'beige',
      'cream': 'crema',
      'silver': 'plata',
      'gold': 'oro',
    };

    // Buscar en las etiquetas de Google Vision
    for (const item of etiquetas) {
      const descripcion = (item.etiqueta || item.label || '').toLowerCase();
      
      // Buscar coincidencias exactas o parciales
      for (const [palabraIngles, palabraEspanola] of Object.entries(traducciones)) {
        if (descripcion.includes(palabraIngles)) {
          return palabraEspanola;
        }
      }
    }

    return 'azul'; // Valor por defecto
  }

  /**
   * Generar nombre descriptivo (Color + Tipo)
   */
  private generarNombre(tipo: string, color: string): string {
    return `${color.charAt(0).toUpperCase() + color.slice(1)} ${tipo}`;
  }

  /**
   * Extraer sección (superior, inferior, calzado, accesorios, vestido)
   */
  private extraerSeccion(tipo: string): string {
    const tipoMinusculas = tipo.toLowerCase();

    // Superior
    if (
      tipoMinusculas.includes('camiseta') ||
      tipoMinusculas.includes('jersey') ||
      tipoMinusculas.includes('suéter') ||
      tipoMinusculas.includes('sudadera') ||
      tipoMinusculas.includes('chaqueta') ||
      tipoMinusculas.includes('abrigo') ||
      tipoMinusculas.includes('blazer') ||
      tipoMinusculas.includes('deportiva')
    ) {
      return 'superior';
    }

    // Inferior
    if (
      tipoMinusculas.includes('pantalón') ||
      tipoMinusculas.includes('jeans') ||
      tipoMinusculas.includes('falda') ||
      tipoMinusculas.includes('shorts') ||
      tipoMinusculas.includes('leggings')
    ) {
      return 'inferior';
    }

    // Calzado
    if (
      tipoMinusculas.includes('zapatos') ||
      tipoMinusculas.includes('botas') ||
      tipoMinusculas.includes('zapatillas') ||
      tipoMinusculas.includes('sandalias') ||
      tipoMinusculas.includes('tacones')
    ) {
      return 'calzado';
    }

    // Accesorios
    if (
      tipoMinusculas.includes('sombrero') ||
      tipoMinusculas.includes('gorra') ||
      tipoMinusculas.includes('bolso') ||
      tipoMinusculas.includes('bufanda') ||
      tipoMinusculas.includes('corbata') ||
      tipoMinusculas.includes('guantes')
    ) {
      return 'accesorios';
    }

    // Vestido (categoría especial)
    if (tipoMinusculas.includes('vestido')) {
      return 'vestido';
    }

    return 'superior'; // Sección por defecto
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

    // Filtrar por sección basándose en el tipo
    return prendas.filter(
      (p) => this.extraerSeccion(p.tipo) === seccion.toLowerCase(),
    );
  }

  /**
   * Obtener todas las prendas del usuario
   */
  async obtenerPrendas(usuario: User): Promise<Prenda[]> {
    return await this.prendaRepository.find({
      where: { usuario: { id: usuario.id } },
      order: { createdAt: 'DESC' },
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