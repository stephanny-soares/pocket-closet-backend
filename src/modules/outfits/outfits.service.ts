import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Outfit } from '../../entities/outfit.entity';
import { Prenda } from '../../entities/prenda.entity';
import { User } from '../../entities/user.entity';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';

@Injectable()
export class OutfitsService {
  private geminiApiKey: string;

  constructor(
    @InjectRepository(Outfit)
    private readonly outfitRepository: Repository<Outfit>,
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
  ) {
    this.geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
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
      const sugerencias = await this.generarSugerenciasConGemini(prendas, clima);

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
  private async generarSugerenciasConGemini(prendas: Prenda[], clima: any): Promise<any[]> {
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
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

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

    // Si no encuentra todas las prendas, usar las que encontró
    if (prendasDelOutfit.length === 0) {
      // Usar 3 prendas aleatorias como fallback
      const indices = [0, 1, 2].map(
        () => Math.floor(Math.random() * prendasDisponibles.length),
      );
      prendasDelOutfit.push(
        ...indices.map((i) => prendasDisponibles[i]),
      );
    }

    const outfit = this.outfitRepository.create({
      nombre: sugerencia.nombre || 'Outfit sugerido',
      categoria: sugerencia.categoria || 'casual',
      estacion: 'todas',
      prendas: prendasDelOutfit,
      usuario,
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
      throw new BadRequestException(
        `Error al crear outfit: ${error.message}`,
      );
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
}