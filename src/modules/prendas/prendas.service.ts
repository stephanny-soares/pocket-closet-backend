import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prenda } from '../../entities/prenda.entity';
import { User } from '../../entities/user.entity';
import { CreatePrendaDto } from './dto/create-prenda.dto';
import { UpdatePrendaDto } from './dto/update-prenda.dto';
import vision from '@google-cloud/vision';

@Injectable()
export class PrendasService {
  private gcpProjectId: string;
  private visionClient: any;

  constructor(
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
  ) {
    this.gcpProjectId = process.env.GOOGLE_CLOUD_VISION_PROJECT_ID || '';
    this.visionClient = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  /**
   * Analizar imagen con Google Cloud Vision y crear prenda
   */
  async crearPrendaDesdeImagen(
    createPrendaDto: CreatePrendaDto,
    usuario: User,
  ): Promise<Prenda> {
    try {
      // Llamar a Google Cloud Vision para clasificación
       const labels = await this.clasificarImagen(createPrendaDto.imagen);
      console.log('Labels recibidos:', labels);

      // Extraer información
      const tipo = this.extraerTipo(labels);
      const color = this.extraerColor(labels);
      const seccion = this.extraerSeccion(tipo);
      const nombre = this.generarNombre(tipo, color);

      // Crear prenda en BD
      const prenda = this.prendaRepository.create({
        nombre: createPrendaDto.nombre || nombre,
        tipo: createPrendaDto.tipo || tipo,
        color: createPrendaDto.color || color,
        seccion: seccion,
        imagen: createPrendaDto.imagen,
        marca: createPrendaDto.marca,
        ocasion: createPrendaDto.ocasion,
        estacion: createPrendaDto.estacion,
        usuario,
        metadatos: {
          labels: labels,
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
   * Clasificar imagen usando Google Cloud Vision
   */
  private async clasificarImagen(imagenInput: string): Promise<any[]> {
    try {
      let request: any;

      // Manejar imagen base64 o URL
      if (imagenInput.startsWith('data:image')) {
        const base64Data = imagenInput.split(',')[1];
        request = {
          image: { content: base64Data },
        };
      } else {
        request = {
          image: { source: { imageUri: imagenInput } },
        };
      }

      const [result] = await this.visionClient.labelDetection(request);
      const labels = result.labelAnnotations || [];

      console.log('Google Cloud Vision result:', labels);
      return labels.map(label => ({
        label: label.description,
        score: label.score,
      }));
    } catch (error) {
      console.error('Error clasificando imagen:', error);
      return this.clasificacionPorDefecto();
    }
  }

  /**
   * Clasificación por defecto si falla Google Cloud Vision
   */
  private clasificacionPorDefecto(): any[] {
    return [
      { label: 'clothing', score: 0.9 },
      { label: 'shirt', score: 0.8 },
    ];
  }

  /**
   * Extraer tipo de prenda de los labels
   */
  private extraerTipo(labels: any[]): string {
    const tiposComunes = [
      'shirt',
      'camiseta',
      'camisa',
      'pants',
      'pantalón',
      'jeans',
      'skirt',
      'falda',
      'dress',
      'vestido',
      'jacket',
      'chaqueta',
      'coat',
      'abrigo',
      'hoodie',
      'sudadera',
      'shoes',
      'zapatos',
      'boots',
      'botas',
      'sneakers',
      'zapatillas',
      'hat',
      'sombrero',
      'cap',
      'gorra',
      'bag',
      'bolso',
      't-shirt',
      'sweater',
      'jersey',
      'clothing',
      'apparel',
    ];

    for (const label of labels) {
      const descripcion = label.label?.toLowerCase() || label.toLowerCase?.() || '';
      for (const tipo of tiposComunes) {
        if (descripcion.includes(tipo)) {
          return tipo;
        }
      }
    }

    return 'camiseta';
  }

  /**
   * Extraer color de los labels
   */
  private extraerColor(labels: any[]): string {
    const coloresComunes = [
      'red',
      'rojo',
      'blue',
      'azul',
      'green',
      'verde',
      'yellow',
      'amarillo',
      'black',
      'negro',
      'white',
      'blanco',
      'gray',
      'gris',
      'pink',
      'rosa',
      'purple',
      'púrpura',
      'orange',
      'naranja',
      'brown',
      'marrón',
    ];

    for (const label of labels) {
      const descripcion = label.label?.toLowerCase() || label.toLowerCase?.() || '';
      for (const color of coloresComunes) {
        if (descripcion.includes(color)) {
          return color;
        }
      }
    }

    return 'azul';
  }

  /**
   * Generar nombre descriptivo
   */
  private generarNombre(tipo: string, color: string): string {
    return `${color.charAt(0).toUpperCase() + color.slice(1)} ${tipo}`;
  }

   /**
   * Extraer sección (superior, inferior, calzado, accesorios, vestido)
   * Útil para la Fase 4 - Outfits
   */
  private extraerSeccion(tipo: string): string {
    const tipo_lower = tipo.toLowerCase();

    if (
      tipo_lower.includes('shirt') ||
      tipo_lower.includes('camiseta') ||
      tipo_lower.includes('camisa') ||
      tipo_lower.includes('jacket') ||
      tipo_lower.includes('chaqueta') ||
      tipo_lower.includes('sweater') ||
      tipo_lower.includes('hoodie') ||
      tipo_lower.includes('sudadera') ||
      tipo_lower.includes('blazer') ||
      tipo_lower.includes('coat') ||
      tipo_lower.includes('abrigo')
    ) {
      return 'superior';
    }

    if (
      tipo_lower.includes('pants') ||
      tipo_lower.includes('pantalón') ||
      tipo_lower.includes('jeans') ||
      tipo_lower.includes('skirt') ||
      tipo_lower.includes('falda') ||
      tipo_lower.includes('shorts') ||
      tipo_lower.includes('bermudas') ||
      tipo_lower.includes('leggings')
    ) {
      return 'inferior';
    }

    if (
      tipo_lower.includes('shoes') ||
      tipo_lower.includes('zapatos') ||
      tipo_lower.includes('boots') ||
      tipo_lower.includes('botas') ||
      tipo_lower.includes('sneakers') ||
      tipo_lower.includes('zapatillas') ||
      tipo_lower.includes('sandals') ||
      tipo_lower.includes('sandalias')
    ) {
      return 'calzado';
    }

    if (
      tipo_lower.includes('hat') ||
      tipo_lower.includes('sombrero') ||
      tipo_lower.includes('cap') ||
      tipo_lower.includes('gorra') ||
      tipo_lower.includes('bag') ||
      tipo_lower.includes('bolso') ||
      tipo_lower.includes('scarf') ||
      tipo_lower.includes('bufanda') ||
      tipo_lower.includes('tie') ||
      tipo_lower.includes('corbata') ||
      tipo_lower.includes('gloves') ||
      tipo_lower.includes('guantes')
    ) {
      return 'accesorios';
    }

    if (
      tipo_lower.includes('dress') ||
      tipo_lower.includes('vestido')
    ) {
      return 'vestido';
    }

    return 'superior'; // Sección por defecto
  }

  /**
   * Obtener prendas filtradas por sección
   * Útil para la Fase 4 - Outfits
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
    updatePrendaDto: UpdatePrendaDto,
    usuario: User,
  ): Promise<Prenda> {
    const prenda = await this.obtenerPrendaPorId(id, usuario);
    Object.assign(prenda, updatePrendaDto);
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
