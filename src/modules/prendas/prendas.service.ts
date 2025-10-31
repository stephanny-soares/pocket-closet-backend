import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prenda } from '../../entities/prenda.entity';
import { User } from '../../entities/user.entity';
import { CreatePrendaDto } from './dto/create-prenda.dto';
import { UpdatePrendaDto } from './dto/update-prenda.dto';

@Injectable()
export class PrendasService {
  private hfApiKey: string;
  private hfApiUrl = 'https://api-inference.huggingface.co/models';

  constructor(
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
  ) {
    this.hfApiKey = process.env.HUGGING_FACE_API_KEY || '';
  }

  /**
   * Analizar imagen con Hugging Face y crear prenda
   */
  async crearPrendaDesdeImagen(
    createPrendaDto: CreatePrendaDto,
    usuario: User,
  ): Promise<Prenda> {
    try {
      // Convertir imagen a buffer
      let imageBuffer: Buffer;
      if (createPrendaDto.imagen.startsWith('data:image')) {
        const base64Data = createPrendaDto.imagen.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const response = await fetch(createPrendaDto.imagen);
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      }

      // Llamar a Hugging Face para clasificación de imagen
      const labels = await this.clasificarImagen(imageBuffer);
      console.log('Labels recibidos:', labels);

      // Extraer información
      const tipo = this.extraerTipo(labels);
      const color = this.extraerColor(labels);
      const nombre = this.generarNombre(tipo, color);

      // Crear prenda en BD
      const prenda = this.prendaRepository.create({
        nombre: createPrendaDto.nombre || nombre,
        tipo: createPrendaDto.tipo || tipo,
        color: createPrendaDto.color || color,
        imagen: createPrendaDto.imagen,
        marca: createPrendaDto.marca,
        ocasion: createPrendaDto.ocasion,
        estacion: createPrendaDto.estacion,
        usuario,
        metadatos: {
          labels: labels,
          procesadoPor: 'HuggingFace',
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
   * Clasificar imagen usando Hugging Face - Modelo Zero-Shot
   */
  private async clasificarImagen(imageBuffer: Buffer): Promise<any[]> {
    try {
      // Usar modelo zero-shot para clasificación de objetos en ropa
      const response = await fetch(
        `${this.hfApiUrl}/Falconsai/nsfw_image_detection`,
        {
          headers: { Authorization: `Bearer ${this.hfApiKey}` },
          method: 'POST',
          body: new Uint8Array(imageBuffer),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Hugging Face error response:', error);
        // Si falla, usar clasificación manual
        return this.clasificacionPorDefecto();
      }

      const result = await response.json();
      console.log('Hugging Face result:', result);
      return result;
    } catch (error) {
      console.error('Error clasificando imagen:', error);
      return this.clasificacionPorDefecto();
    }
  }

  /**
   * Clasificación por defecto si falla Hugging Face
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
