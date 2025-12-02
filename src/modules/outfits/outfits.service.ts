import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import sharp from 'sharp';
import { Storage } from '@google-cloud/storage';
import { Outfit } from '../../entities/outfit.entity';
import { Prenda } from '../../entities/prenda.entity';
import { User } from '../../entities/user.entity';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';
import { CreateOutfitPorPrendaDto } from './dto/create-outfitPorPrenda.dto';
import { CreateOutfitPorEventoDto } from './dto/create-outfitPorEvento.dto';
import { CreateOutfitPorClimaDto } from './dto/create-outfitPorClima.dto';
import { Evento } from '../../entities/evento.entity';

@Injectable()
export class OutfitsService {
  private geminiApiKey: string;
  private storage: Storage;
  private bucketName: string =
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'pocketcloset-prendas';

  constructor(
    @InjectRepository(Outfit)
    private readonly outfitRepository: Repository<Outfit>,
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
    @InjectRepository(Evento)
    private readonly eventoRepository: Repository<Evento>,
  ) {
    this.geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_VISION_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  /**
   * Sugerir 3 outfits variados con IA basados en prendas del usuario Y CLIMA
   */
  async sugerirOutfits(usuario: User): Promise<Outfit[]> {
    try {
      // Obtener todas las prendas del usuario
      const prendas = await this.prendaRepository.find({
        where: { usuario: { id: usuario.id } },
      });

      if (prendas.length < 2) {
        throw new BadRequestException(
          'Necesitas al menos 2 prendas para generar sugerencias de outfits',
        );
      }

      console.log('🎨 === GENERANDO SUGERENCIAS DE OUTFITS CON IA ===');
      console.log(`📦 Prendas disponibles: ${prendas.length}`);

      // Obtener clima actual
      const clima = await this.obtenerClima();
      console.log(`🌡️ Clima: ${clima.temperatura}°C, ${clima.condicion}`);

      // Generar sugerencias con Gemini considerando clima
      const sugerencias = await this.generarSugerenciasConGemini(
        prendas,
        clima,
      );

      // Crear los outfits sugeridos en BD
      const outfitsCreados: Outfit[] = [];
      for (const sugerencia of sugerencias) {
        const outfitCreado = await this.crearOutfitDesdesugerencia(
          sugerencia,
          prendas,
          usuario,
        );
        outfitsCreados.push(outfitCreado);
      }

      console.log('✅ Outfits sugeridos creados exitosamente');
      return outfitsCreados;
    } catch (error) {
      console.error('❌ ERROR en sugerirOutfits:', error.message);
      throw new BadRequestException(
        `Error al generar sugerencias: ${error.message}`,
      );
    }
  }

  /**
   * Obtener clima actual (Alicante)
   */
  private async obtenerClima(): Promise<any> {
    try {
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=38.3452&longitude=-0.4810&current=temperature_2m,weather_code&timezone=Europe/Madrid',
      );
      const data: any = await response.json();
      const temperatura = Math.round(data.current.temperature_2m);
      const codigo = data.current.weather_code;

      const condicionMap: { [key: number]: string } = {
        0: 'Despejado',
        1: 'Mayormente despejado',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Niebla',
        51: 'Lluvia ligera',
        61: 'Lluvia',
        80: 'Lluvia fuerte',
        95: 'Tormenta',
      };

      const condicion = condicionMap[codigo] || 'Desconocido';

      return { temperatura, condicion, codigo };
    } catch (error) {
      console.error('Error obteniendo clima:', error);
      return { temperatura: 20, condicion: 'Desconocido', codigo: 0 };
    }
  }

  /**
   * Generar sugerencias con Gemini considerando CLIMA
   */
  private async generarSugerenciasConGemini(
    prendas: Prenda[],
    clima: any,
  ): Promise<any[]> {
    try {
      console.log('📤 Enviando solicitud a Gemini con info de clima...');

      // Preparar lista de prendas con sus características
      const listaPrendas = prendas
        .map(
          (p, i) =>
            `${i + 1}. ${p.nombre} (tipo: ${p.tipo}, color: ${p.color}, sección: ${p.seccion}, estación: ${p.estacion})`,
        )
        .join('\n');

      const prompt = `Eres un experto en moda. El clima actual es: ${clima.temperatura}°C, ${clima.condicion}.

Tengo estas prendas disponibles:
${listaPrendas}

Genera EXACTAMENTE 3 outfits variados e INTELIGENTES considerando:

1. **LA TEMPERATURA**: ${clima.temperatura}°C
   - Menos de 10°C: Recomienda abrigos, sweaters, prendas de invierno
   - 10-15°C: Suéter + chaqueta ligera
   - 15-20°C: Camiseta + chaqueta ligera
   - Más de 20°C: Prendas ligeras, sin abrigo pesado

2. **ESTACIÓN DE LAS PRENDAS**: Combina prendas que sean para la misma estación
3. **ESTRUCTURA**: Un outfit puede tener:
   - 1 prenda (vestido completo)
   - 2 prendas (inferior + superior)
   - 3+ prendas (inferior + superior + abrigo/accesorios)

4. **CATEGORÍAS VARIADAS**: casual, formal/elegante, deportivo/sport

Responde con un JSON array de 3 outfits:
[
  {
    "nombre": "nombre descriptivo",
    "categoria": "casual|formal|deporte",
    "prendas": ["nombre prenda 1", "nombre prenda 2", ...]
  }
]

SOLO devuelve el array JSON, sin explicaciones.`;

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
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error de Gemini:', errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log('📝 Respuesta de Gemini:', responseText.substring(0, 200));

      // Parsear JSON del array de outfits
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        console.error('❌ No se encontró JSON en la respuesta');
        throw new Error('Respuesta inválida de Gemini');
      }

      const sugerencias = JSON.parse(jsonMatch[0]);
      console.log('✅ Sugerencias parseadas:', sugerencias.length);

      return sugerencias;
    } catch (error: any) {
      console.error('❌ ERROR en generarSugerenciasConGemini:', error.message);
      throw error;
    }
  }

  /**
   * Seleccionar mejores prendas con Gemini cuando no se encuentran todas las sugeridas
   */
  private async seleccionarMejoresPrendasConGemini(
    prendasDisponibles: Prenda[],
    sugerencia: any,
    cantidadPrendas: number = 3,
  ): Promise<Prenda[]> {
    try {
      console.log('🤖 === SELECCIONANDO MEJORES PRENDAS CON GEMINI ===');

      // Preparar lista de prendas con sus características
      const listaPrendas = prendasDisponibles
        .map(
          (p, i) =>
            `${i + 1}. ${p.nombre} (tipo: ${p.tipo}, color: ${p.color}, sección: ${p.seccion}, estación: ${p.estacion})`,
        )
        .join('\n');

      const prompt = `Eres un experto en moda. Necesito que selecciones las ${cantidadPrendas} prendas que mejor combinen para un outfit.

La sugerencia de outfit es:
- Nombre: ${sugerencia.nombre}
- Categoría: ${sugerencia.categoria}

Prendas disponibles:
${listaPrendas}

Selecciona las ${cantidadPrendas} mejores prendas que:
1. Combinen bien entre sí (colores, estilos)
2. Formen un outfit coherente de categoría "${sugerencia.categoria}"
3. Cubran diferentes secciones (superior, inferior, etc.)

Responde SOLO con un JSON array con los nombres EXACTOS de las prendas:
["nombre prenda 1", "nombre prenda 2", "nombre prenda 3"]`;

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
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error de Gemini:', errorData);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log('📝 Respuesta de Gemini:', responseText);

      // Parsear JSON del array de prendas
      const jsonMatch = responseText.match(/\[\s*"[\s\S]*"\s*\]/);
      if (!jsonMatch) {
        console.error('❌ No se encontró JSON en la respuesta');
        throw new Error('Respuesta inválida de Gemini');
      }

      const nombresPrendas = JSON.parse(jsonMatch[0]);

      // Mapear nombres a objetos Prenda
      const prendasSeleccionadas = nombresPrendas
        .map((nombre: string) =>
          prendasDisponibles.find(
            (p) => p.nombre.toLowerCase() === nombre.toLowerCase(),
          ),
        )
        .filter((p: any) => p !== undefined);

      console.log(
        `✅ Gemini seleccionó ${prendasSeleccionadas.length} prendas`,
      );

      return prendasSeleccionadas;
    } catch (error: any) {
      console.error(
        '❌ ERROR en seleccionarMejoresPrendasConGemini:',
        error.message,
      );
      // Fallback a aleatorio si falla Gemini
      const indices = Array.from({ length: cantidadPrendas }, () =>
        Math.floor(Math.random() * prendasDisponibles.length),
      );
      return indices.map((i) => prendasDisponibles[i]);
    }
  }

  /**
   * Generar collage de imágenes del outfit
   */
  private async generarImagenOutfitConGemini(
    prendasDelOutfit: Prenda[],
  ): Promise<Buffer> {
    try {
      console.log('🎨 === GENERANDO COLLAGE DE IMÁGENES DEL OUTFIT ===');
      console.log(`📷 Prendas para collage: ${prendasDelOutfit.length}`);

      // Descargar las imágenes de las prendas
      const bufersImagenes = await Promise.all(
        prendasDelOutfit.map((prenda) => this.descargarImagen(prenda.imagen)),
      );

      // Crear collage con Sharp
      const collage = await this.crearCollageConSharp(bufersImagenes);

      console.log('✅ Collage generado exitosamente');
      return collage;
    } catch (error: any) {
      console.error('❌ ERROR en generarImagenOutfitConGemini:', error.message);
      throw error;
    }
  }

  /**
   * Descargar imagen desde Google Cloud Storage
   */
  private async descargarImagen(urlImagen: string): Promise<Buffer> {
    try {
      console.log(
        `📥 Descargando imagen desde GCS: ${urlImagen.substring(0, 50)}...`,
      );

      // Extraer el nombre del archivo de la URL
      const nombreArchivo = urlImagen
        .split(`/${this.bucketName}/`)[1]
        ?.split('?')[0];

      if (!nombreArchivo) {
        throw new Error('No se pudo extraer el nombre del archivo de la URL');
      }

      const bucket = this.storage.bucket(this.bucketName);
      const [contenido] = await bucket.file(nombreArchivo).download();

      console.log(`✅ Imagen descargada: ${contenido.length} bytes`);
      return contenido;
    } catch (error: any) {
      console.error('❌ ERROR descargando imagen:', error.message);
      throw error;
    }
  }

  /**
   * Crear collage con Sharp
   */
  private async crearCollageConSharp(
    bufersImagenes: Buffer[],
  ): Promise<Buffer> {
    try {
      console.log(
        `🖼️ Creando collage con ${bufersImagenes.length} imágenes...`,
      );

      // Redimensionar todas las imágenes al mismo tamaño
      const tamanoPrenda = 200;
      const espaciado = 10;

      const imagenesRedimensionadas = await Promise.all(
        bufersImagenes.map((buffer) =>
          sharp(buffer)
            .resize(tamanoPrenda, tamanoPrenda, {
              fit: 'cover',
              position: 'center',
            })
            .toBuffer(),
        ),
      );

      // Decidir layout según cantidad de prendas
      let collage: Buffer;

      if (imagenesRedimensionadas.length <= 3) {
        // Layout horizontal para 1-3 prendas
        console.log('📐 Layout: horizontal');
        const composicion = imagenesRedimensionadas.map((img, idx) => ({
          input: img,
          left: idx * (tamanoPrenda + espaciado),
          top: 0,
        }));

        const anchoTotal =
          imagenesRedimensionadas.length * tamanoPrenda +
          (imagenesRedimensionadas.length - 1) * espaciado;

        collage = await sharp({
          create: {
            width: anchoTotal,
            height: tamanoPrenda,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        })
          .composite(composicion)
          .jpeg({ quality: 85 })
          .toBuffer();
      } else {
        // Layout grid para 4+ prendas
        console.log('📐 Layout: grid');
        const columnasYFilas = Math.ceil(
          Math.sqrt(imagenesRedimensionadas.length),
        );

        const composicion = imagenesRedimensionadas.map((img, idx) => {
          const fila = Math.floor(idx / columnasYFilas);
          const columna = idx % columnasYFilas;
          return {
            input: img,
            left: columna * (tamanoPrenda + espaciado),
            top: fila * (tamanoPrenda + espaciado),
          };
        });

        const dimension =
          columnasYFilas * tamanoPrenda + (columnasYFilas - 1) * espaciado;

        collage = await sharp({
          create: {
            width: dimension,
            height: dimension,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        })
          .composite(composicion)
          .jpeg({ quality: 85 })
          .toBuffer();
      }

      console.log('✅ Collage creado correctamente');
      return collage;
    } catch (error: any) {
      console.error('❌ ERROR en crearCollageConSharp:', error.message);
      throw error;
    }
  }

  /**
   * Subir imagen del outfit a Storage en carpeta outfits/
   */
  private async subirImagenOutfitAStorage(
    bufferImagen: Buffer,
  ): Promise<string> {
    try {
      console.log('📤 Subiendo imagen del outfit a Storage...');

      const bucket = this.storage.bucket(this.bucketName);

      // Generar nombre único para la imagen del outfit
      const timestamp = Date.now();
      const nombreArchivo = `outfits/${timestamp}-outfit.jpg`;

      const file = bucket.file(nombreArchivo);

      // Subir archivo
      await file.save(bufferImagen, {
        metadata: {
          contentType: 'image/jpeg',
        },
      });

      // Generar URL firmada (7 días)
      const [urlFirmada] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      console.log(`✅ Imagen del outfit subida: ${nombreArchivo}`);
      return urlFirmada;
    } catch (error: any) {
      console.error('❌ ERROR en subirImagenOutfitAStorage:', error.message);
      throw error;
    }
  }

  /**
   * Crear outfit basado en sugerencia de Gemini
   */
  private async crearOutfitDesdesugerencia(
    sugerencia: any,
    prendasDisponibles: Prenda[],
    usuario: User,
  ): Promise<Outfit> {
    // Buscar las prendas sugeridas por nombre
    const prendasDelOutfit = sugerencia.prendas
      .map((nombrePrenda: string) => {
        const prenda = prendasDisponibles.find(
          (p) => p.nombre.toLowerCase() === nombrePrenda.toLowerCase(),
        );
        return prenda;
      })
      .filter((p: any) => p !== undefined);

    // Si no encuentra todas las prendas, usar Gemini para seleccionar las mejores
    let prendasFinales = prendasDelOutfit;
    if (prendasDelOutfit.length === 0) {
      console.log(
        '⚠️ No se encontraron todas las prendas sugeridas, usando Gemini para seleccionar mejores prendas...',
      );
      prendasFinales = await this.seleccionarMejoresPrendasConGemini(
        prendasDisponibles,
        sugerencia,
        3,
      );
    }

    // Generar imagen del outfit (collage)
    const bufferImagen =
      await this.generarImagenOutfitConGemini(prendasFinales);

    // Subir imagen a Storage
    const urlImagen = await this.subirImagenOutfitAStorage(bufferImagen);

    const outfit = this.outfitRepository.create({
      nombre: sugerencia.nombre || 'Outfit sugerido',
      categoria: sugerencia.categoria || 'casual',
      estacion: 'todas',
      prendas: prendasFinales,
      usuario,
      imagen: urlImagen,
    });

    return await this.outfitRepository.save(outfit);
  }

  /**
   * Crear nuevo outfit
   */
  async crearOutfit(
    createOutfitDto: CreateOutfitDto,
    usuario: User,
  ): Promise<Outfit> {
    try {
      // Validar que existan las prendas
      const prendas = await this.prendaRepository.find({
        where: {
          id: In(createOutfitDto.prendasIds),
          usuario: { id: usuario.id }, // Solo prendas del usuario
        },
      });

      if (prendas.length !== createOutfitDto.prendasIds.length) {
        throw new BadRequestException(
          'Una o más prendas no existen o no pertenecen al usuario',
        );
      }

      // Crear outfit
      const outfit = this.outfitRepository.create({
        nombre: createOutfitDto.nombre,
        imagen: createOutfitDto.imagen,
        categoria: createOutfitDto.categoria,
        estacion: createOutfitDto.estacion,
        prendas: prendas,
        usuario,
      });

      return await this.outfitRepository.save(outfit);
    } catch (error) {
      throw new BadRequestException(`Error al crear outfit: ${error.message}`);
    }
  }

  /**
   * Obtener todos los outfits del usuario
   */
  async obtenerOutfits(usuario: User): Promise<Outfit[]> {
    return await this.outfitRepository.find({
      where: { usuario: { id: usuario.id } },
      relations: ['prendas'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener outfit por ID
   */
  async obtenerOutfitPorId(id: string, usuario: User): Promise<Outfit> {
    const outfit = await this.outfitRepository.findOne({
      where: { id, usuario: { id: usuario.id } },
      relations: ['prendas'],
    });

    if (!outfit) {
      throw new BadRequestException('Outfit no encontrado');
    }

    return outfit;
  }

  /**
   * Actualizar outfit
   */
  async actualizarOutfit(
    id: string,
    updateOutfitDto: UpdateOutfitDto,
    usuario: User,
  ): Promise<Outfit> {
    const outfit = await this.obtenerOutfitPorId(id, usuario);

    // Si actualiza las prendas, validar que existan
    if (
      updateOutfitDto.prendasIds &&
      Array.isArray(updateOutfitDto.prendasIds) &&
      updateOutfitDto.prendasIds.length > 0
    ) {
      const prendas = await this.prendaRepository.find({
        where: {
          id: In(updateOutfitDto.prendasIds),
          usuario: { id: usuario.id },
        },
      });

      if (prendas.length !== updateOutfitDto.prendasIds.length) {
        throw new BadRequestException(
          'Una o más prendas no existen o no pertenecen al usuario',
        );
      }

      outfit.prendas = prendas;
    }

    // Actualizar otros campos (solo si vienen en el request)
    if (updateOutfitDto.nombre !== undefined)
      outfit.nombre = updateOutfitDto.nombre;
    if (updateOutfitDto.imagen !== undefined)
      outfit.imagen = updateOutfitDto.imagen;
    if (updateOutfitDto.categoria !== undefined)
      outfit.categoria = updateOutfitDto.categoria;
    if (updateOutfitDto.estacion !== undefined)
      outfit.estacion = updateOutfitDto.estacion;

    return await this.outfitRepository.save(outfit);
  }

  /**
   * Eliminar outfit
   */
  async eliminarOutfit(id: string, usuario: User): Promise<void> {
    const outfit = await this.obtenerOutfitPorId(id, usuario);
    await this.outfitRepository.remove(outfit);
  }

  /**
   * Obtener outfits filtrados por categoría
   */
  async obtenerOutfitsPorCategoria(
    usuario: User,
    categoria: string,
  ): Promise<Outfit[]> {
    return await this.outfitRepository.find({
      where: {
        usuario: { id: usuario.id },
        categoria: categoria,
      },
      relations: ['prendas'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener outfits filtrados por estación
   */
  async obtenerOutfitsPorEstacion(
    usuario: User,
    estacion: string,
  ): Promise<Outfit[]> {
    return await this.outfitRepository.find({
      where: {
        usuario: { id: usuario.id },
        estacion: estacion,
      },
      relations: ['prendas'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Crear outfit basado en una prenda seleccionada
   */
  async crearOutfitPorPrenda(
    createOutfitDto: CreateOutfitPorPrendaDto,
    usuario: User,
  ): Promise<Outfit> {
    try {
      // Obtener la prenda seleccionada
      const prendaBase = await this.prendaRepository.findOne({
        where: { id: createOutfitDto.prendaId, usuario: { id: usuario.id } },
      });

      if (!prendaBase) {
        throw new BadRequestException('Prenda no encontrada');
      }

      // Obtener todas las prendas del usuario
      const todasPrendas = await this.prendaRepository.find({
        where: { usuario: { id: usuario.id } },
      });

      if (todasPrendas.length < 2) {
        throw new BadRequestException(
          'Necesitas al menos 2 prendas para generar un outfit',
        );
      }

      // ✅ Si hay eventoId, obtener contexto del evento
      let evento: any = null;
      let estacion = createOutfitDto.estacion || 'todas';
      let clima: any = null;

      if (createOutfitDto.eventoId) {
        evento = await this.eventoRepository.findOne({
          where: { id: createOutfitDto.eventoId, usuario: { id: usuario.id } },
        });

        if (evento) {
          // Calcular estación considerando hemisferio
          estacion = this.calcularEstacionPorUbicacion(
            evento.fecha,
            evento.ciudad,
          );

          // Obtener clima para la ubicación del evento
          if (evento.ciudad) {
            clima = await this.obtenerClimaParaUbicacion(evento.ciudad);
          } else {
            clima = await this.obtenerClima();
          }
        }
      }

      // Usar Gemini para seleccionar las mejores prendas para complementar
      const prendasSeleccionadas =
        await this.seleccionarMejoresPrendasConGemini(
          todasPrendas,
          {
            nombre: prendaBase.nombre,
            categoria: createOutfitDto.categoria || 'casual',
            evento: evento, // ✅ Pasar el evento
            clima: clima, // ✅ Pasar el clima
            estacion: estacion, // ✅ Pasar la estación calculada
          },
          3,
        );

      // Generar imagen del outfit
      const bufferImagen =
        await this.generarImagenOutfitConGemini(prendasSeleccionadas);

      // Subir imagen a Storage
      const urlImagen = await this.subirImagenOutfitAStorage(bufferImagen);

      // Crear outfit
      const outfit = this.outfitRepository.create({
        nombre: `Outfit con ${prendaBase.nombre}`,
        categoria: createOutfitDto.categoria || 'casual',
        estacion: estacion,
        prendas: prendasSeleccionadas,
        usuario,
        imagen: urlImagen,
        evento: evento,  // ✅ Asociar al evento si existe
      });

      return outfit;
    } catch (error) {
      throw new BadRequestException(
        `Error al crear outfit por prenda: ${error.message}`,
      );
    }
  }

  /**
   * Calcular estación considerando fecha y hemisferio (por ciudad)
   */
  private calcularEstacionPorUbicacion(fecha: string, ciudad?: string): string {
    const fecha_obj = new Date(fecha + 'T00:00:00');
    const mes = fecha_obj.getMonth() + 1; // 1-12

    // Detectar si es hemisferio sur (aproximado)
    const ciudadesSur = [
      'buenos aires',
      'argentina',
      'chile',
      'australia',
      'sydney',
      'melbourne',
      'johannesburgo',
      'sudáfrica',
      'brasil',
      'são paulo',
      'perú',
      'lima',
    ];

    const esSur = ciudad
      ? ciudadesSur.some((c) => ciudad.toLowerCase().includes(c))
      : false;

    // Estaciones hemisferio norte
    if (!esSur) {
      if (mes >= 3 && mes <= 5) return 'primavera';
      if (mes >= 6 && mes <= 8) return 'verano';
      if (mes >= 9 && mes <= 11) return 'otoño';
      return 'invierno';
    }

    // Estaciones hemisferio sur (opuesto)
    if (mes >= 3 && mes <= 5) return 'otoño';
    if (mes >= 6 && mes <= 8) return 'invierno';
    if (mes >= 9 && mes <= 11) return 'primavera';
    return 'verano';
  }

  /**
   * Obtener clima predictivo para una ciudad y fecha
   */
  private async obtenerClimaParaUbicacion(
    ciudad: string,
    fecha?: string,
  ): Promise<any> {
    try {
      console.log(`🌍 Obteniendo clima para ${ciudad}...`);

      // 1️⃣ Obtener coordenadas de la ciudad
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          ciudad,
        )}&count=1`,
      );

      const geoData: any = await geoResponse.json();

      if (!geoData?.results || geoData.results.length === 0) {
        console.log(`⚠️ Ciudad ${ciudad} no encontrada, usando clima default`);
        return { temperatura: 20, condicion: 'Desconocido', codigo: 0 };
      }

      const { latitude, longitude } = geoData.results[0];
      console.log(`📍 Coordenadas de ${ciudad}: ${latitude}, ${longitude}`);

      // 2️⃣ Obtener clima
      const climaResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`,
      );

      const climaData: any = await climaResponse.json();
      const temperatura = Math.round(climaData.current.temperature_2m);
      const codigo = climaData.current.weather_code;

      const condicionMap: { [key: number]: string } = {
        0: 'Despejado',
        1: 'Mayormente despejado',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Niebla',
        51: 'Lluvia ligera',
        61: 'Lluvia',
        80: 'Lluvia fuerte',
        95: 'Tormenta',
      };

      const condicion = condicionMap[codigo] || 'Desconocido';

      console.log(`🌡️ Clima de ${ciudad}: ${temperatura}°C, ${condicion}`);

      return { temperatura, condicion, codigo };
    } catch (error) {
      console.error(`❌ Error obteniendo clima para ${ciudad}:`, error);
      return { temperatura: 20, condicion: 'Desconocido', codigo: 0 };
    }
  }

  /**
   * Crear outfit basado en un evento considerando ubicación y estación
   */
  async crearOutfitPorEvento(
    createOutfitDto: CreateOutfitPorEventoDto,
    usuario: User,
  ): Promise<Outfit> {
    try {
      // 1️⃣ Buscar evento en BD
      const evento = await this.eventoRepository.findOne({
        where: { id: createOutfitDto.eventoId, usuario: { id: usuario.id } },
      });

      if (!evento) {
        throw new BadRequestException('Evento no encontrado');
      }

      // 2️⃣ Obtener todas las prendas del usuario
      const prendas = await this.prendaRepository.find({
        where: { usuario: { id: usuario.id } },
      });

      if (prendas.length < 2) {
        throw new BadRequestException(
          'Necesitas al menos 2 prendas para generar un outfit',
        );
      }

      console.log(
        `🎉 === GENERANDO OUTFIT PARA EVENTO: ${evento.nombre.toUpperCase()} ===`,
      );

      // 3️⃣ Calcular estación por fecha y ciudad
      const estacion = this.calcularEstacionPorUbicacion(
        evento.fecha,
        evento.ciudad,
      );
      console.log(`📅 Estación calculada: ${estacion}`);

      // 4️⃣ Obtener clima para la ubicación del evento
      let clima: any;
      if (evento.ciudad) {
        clima = await this.obtenerClimaParaUbicacion(evento.ciudad);
      } else {
        // Default: Alicante
        clima = await this.obtenerClima();
      }

      // 5️⃣ Usar Gemini para sugerir outfit considerando evento + clima + estación + ubicación
      const sugerencia = await this.sugerirOutfitPorEvento(
        prendas,
        evento,
        clima,
        estacion,
        createOutfitDto.categoria,
      );

      // 6️⃣ Seleccionar prendas
      const prendasSeleccionadas =
        await this.seleccionarMejoresPrendasConGemini(prendas, sugerencia, 3);

      // 7️⃣ Generar imagen del outfit
      const bufferImagen =
        await this.generarImagenOutfitConGemini(prendasSeleccionadas);

      // 8️⃣ Subir imagen a Storage
      const urlImagen = await this.subirImagenOutfitAStorage(bufferImagen);

      // 9️⃣ Crear outfit (SIN guardar en BD)
      const outfit = this.outfitRepository.create({
        nombre: sugerencia.nombre,
        categoria:
          sugerencia.categoria || createOutfitDto.categoria || 'casual',
        estacion: estacion,
        prendas: prendasSeleccionadas,
        usuario,
        imagen: urlImagen,
        evento: evento,
      });

      return outfit;
    } catch (error) {
      throw new BadRequestException(
        `Error al crear outfit por evento: ${error.message}`,
      );
    }
  }

  /**
   * Sugerir outfit basado en evento + clima + estación con Gemini
   */
  private async sugerirOutfitPorEvento(
    prendas: Prenda[],
    evento: Evento,
    clima: any,
    estacion: string,
    categoriaHint?: string,
  ): Promise<any> {
    try {
      const listaPrendas = prendas
        .map(
          (p, i) =>
            `${i + 1}. ${p.nombre} (tipo: ${p.tipo}, color: ${p.color}, sección: ${p.seccion})`,
        )
        .join('\n');

      const prompt = `Eres un experto en moda. El usuario quiere crear un outfit para este evento:

**Evento:** ${evento.nombre}
**Descripción:** ${evento.descripcion || 'Sin descripción'}
**Tipo:** ${evento.tipo || 'General'}
**Ubicación:** ${evento.ciudad || 'Alicante'}
**Fecha:** ${evento.fecha}
**Estación:** ${estacion}
**Clima actual/esperado:** ${clima.temperatura}°C, ${clima.condicion}

Prendas disponibles:
${listaPrendas}

Sugiere un outfit que sea:
1. Apropiado para el tipo de evento: ${evento.nombre}
2. Cómodo para el clima: ${clima.temperatura}°C y la estación ${estacion}
3. Adecuado para la ubicación: ${evento.ciudad || 'Alicante'}
4. Coherente en colores y estilos

Responde SOLO con JSON (sin explicaciones):
{
  "nombre": "nombre descriptivo del outfit",
  "categoria": "casual|formal|deporte|elegante",
  "estacion": "${estacion}",
  "prendas": ["nombre prenda 1", "nombre prenda 2", "nombre prenda 3"]
}`;

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
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Respuesta inválida de Gemini');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      console.error('❌ ERROR en sugerirOutfitPorEvento:', error.message);
      throw error;
    }
  }

  /**
   * Crear outfit basado en clima actual
   */
  async crearOutfitPorClima(
    createOutfitDto: CreateOutfitPorClimaDto,
    usuario: User,
  ): Promise<Outfit> {
    try {
      // Obtener todas las prendas del usuario
      const prendas = await this.prendaRepository.find({
        where: { usuario: { id: usuario.id } },
      });

      if (prendas.length < 2) {
        throw new BadRequestException(
          'Necesitas al menos 2 prendas para generar un outfit',
        );
      }

      // Obtener clima actual
      const clima = createOutfitDto.temperatura
        ? { temperatura: createOutfitDto.temperatura, condicion: 'Custom' }
        : await this.obtenerClima();

      console.log(
        `🌡️ === GENERANDO OUTFIT PARA CLIMA: ${clima.temperatura}°C ===`,
      );

      // Generar sugerencia considerando clima
      const sugerencia = await this.sugerirOutfitPorClima(
        prendas,
        clima,
        createOutfitDto.categoria,
      );

      // Seleccionar prendas
      const prendasSeleccionadas =
        await this.seleccionarMejoresPrendasConGemini(prendas, sugerencia, 3);

      // Generar imagen del outfit
      const bufferImagen =
        await this.generarImagenOutfitConGemini(prendasSeleccionadas);

      // Subir imagen a Storage
      const urlImagen = await this.subirImagenOutfitAStorage(bufferImagen);

      // Crear outfit
      const outfit = this.outfitRepository.create({
        nombre: sugerencia.nombre,
        categoria:
          sugerencia.categoria || createOutfitDto.categoria || 'casual',
        estacion: 'todas',
        prendas: prendasSeleccionadas,
        usuario,
        imagen: urlImagen,
      });

      return outfit;
    } catch (error) {
      throw new BadRequestException(
        `Error al crear outfit por clima: ${error.message}`,
      );
    }
  }

  /**
   * Sugerir outfit basado en clima con Gemini
   */
  private async sugerirOutfitPorClima(
    prendas: Prenda[],
    clima: any,
    categoriaHint?: string,
  ): Promise<any> {
    try {
      const listaPrendas = prendas
        .map(
          (p, i) =>
            `${i + 1}. ${p.nombre} (tipo: ${p.tipo}, color: ${p.color}, sección: ${p.seccion})`,
        )
        .join('\n');

      const prompt = `Eres un experto en moda. El clima actual es: ${clima.temperatura}°C, ${clima.condicion}

Prendas disponibles:
${listaPrendas}

Sugiere un outfit que sea apropiado para este clima y sea cómodo. Responde con JSON:
{
  "nombre": "nombre descriptivo del outfit",
  "categoria": "${categoriaHint || 'casual'}",
  "prendas": ["nombre prenda 1", "nombre prenda 2", "nombre prenda 3"]
}`;

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
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Respuesta inválida de Gemini');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      console.error('❌ ERROR en sugerirOutfitPorClima:', error.message);
      throw error;
    }
  }
}
