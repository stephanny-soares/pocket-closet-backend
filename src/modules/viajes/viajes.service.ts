import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Viaje } from '../../entities/viaje.entity';
import { MaletaOutfit } from '../../entities/maleta-outfits.entity';
import { Prenda } from '../../entities/prenda.entity';
import { User } from '../../entities/user.entity';
import { CreateViajeDto } from './dto/create-viaje.dto';
import { UpdateViajeDto } from './dto/update-viaje.dto';
import { GenerarMaletaDto } from './dto/generar-maleta.dto';
import { CreateMaletaOutfitDto } from './dto/create-maleta-outfit.dto';
import { UpdateMaletaOutfitDto } from './dto/update-maleta-outfit.dto';

@Injectable()
export class ViajesService {
  private geminiApiKey: string;

  constructor(
    @InjectRepository(Viaje)
    private readonly viajeRepository: Repository<Viaje>,
    @InjectRepository(MaletaOutfit)
    private readonly maletaOutfitRepository: Repository<MaletaOutfit>,
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
  ) {
    this.geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
  }

  // ============================================================
  // CRUD VIAJES
  // ============================================================

  async crearViaje(createViajeDto: CreateViajeDto, usuario: User): Promise<Viaje> {
    try {
      console.log('📍 === CREANDO NUEVO VIAJE ===');
      console.log(`Destino: ${createViajeDto.destino}`);
      console.log(`Duración: ${createViajeDto.fechaInicio} a ${createViajeDto.fechaFin}`);

      const viaje = this.viajeRepository.create({
        ...createViajeDto,
        usuario,
      });

      const viajeGuardado = await this.viajeRepository.save(viaje);
      console.log(`✅ Viaje creado: ${viajeGuardado.id}`);

      return viajeGuardado;
    } catch (error) {
      console.error('❌ Error creando viaje:', error.message);
      throw new BadRequestException(`Error al crear viaje: ${error.message}`);
    }
  }

  async obtenerViajes(usuario: User): Promise<Viaje[]> {
    return await this.viajeRepository.find({
      where: { usuario: { id: usuario.id } },
      order: { fechaInicio: 'DESC' },
    });
  }

  async obtenerViajePorId(id: string, usuario: User): Promise<Viaje> {
    const viaje = await this.viajeRepository.findOne({
      where: { id, usuario: { id: usuario.id } },
    });

    if (!viaje) {
      throw new NotFoundException('Viaje no encontrado');
    }

    return viaje;
  }

  async actualizarViaje(
    id: string,
    updateViajeDto: UpdateViajeDto,
    usuario: User,
  ): Promise<Viaje> {
    const viaje = await this.obtenerViajePorId(id, usuario);

    Object.assign(viaje, updateViajeDto);

    return await this.viajeRepository.save(viaje);
  }

  async eliminarViaje(id: string, usuario: User): Promise<void> {
    const viaje = await this.obtenerViajePorId(id, usuario);
    await this.viajeRepository.remove(viaje);
  }

  // ============================================================
  // GENERAR MALETA CON IA
  // ============================================================

  async generarMaleta(
    viajeId: string,
    usuario: User,
    generarMaletaDto: GenerarMaletaDto,
  ): Promise<MaletaOutfit[]> {
    try {
      const viaje = await this.obtenerViajePorId(viajeId, usuario);

      // Validar que tenga prendas
      const prendas = await this.prendaRepository.find({
        where: { usuario: { id: usuario.id } },
      });

      if (prendas.length < 2) {
        throw new BadRequestException(
          'Necesitas al menos 2 prendas para generar una maleta',
        );
      }

      console.log('🧳 === GENERANDO MALETA CON IA ===');
      console.log(`📍 Destino: ${viaje.destino}`);
      console.log(`📅 Duración: ${this.calcularDiasViaje(viaje.fechaInicio, viaje.fechaFin)} días`);
      console.log(`🏝️ Actividades: ${viaje.actividades?.join(', ')}`);

      // Obtener clima del destino
      const clima = await this.obtenerClimaParaUbicacion(viaje.ciudad || viaje.destino);
      console.log(`🌡️ Clima: ${clima.temperatura}°C, ${clima.condicion}`);

      // Calcular estación
      const estacion = this.calcularEstacionPorUbicacion(
        viaje.fechaInicio,
        viaje.ciudad,
      );
      console.log(`🌱 Estación: ${estacion}`);

      // Generar recomendaciones con Gemini
      const recomendaciones = await this.generarRecomendacionesMaletaConGemini(
        viaje,
        prendas,
        clima,
        estacion,
        generarMaletaDto,
      );

      // Crear MaletaOutfits en BD
      const maletas = await Promise.all(
        recomendaciones.map((rec) =>
          this.crearMaletaOutfitDesdeRecomendacion(rec, viaje, prendas),
        ),
      );

      // Marcar viaje como con maleta generada
      viaje.maletaGenerada = true;
      await this.viajeRepository.save(viaje); // ✅ Guarda también tipoMaletaCalculado

      console.log(`✅ Maleta generada con ${maletas.length} outfits`);
      return maletas;
    } catch (error) {
      console.error('❌ Error generando maleta:', error.message);
      throw new BadRequestException(`Error al generar maleta: ${error.message}`);
    }
  }

  // ============================================================
  // IA - GENERAR RECOMENDACIONES
  // ============================================================

  private async generarRecomendacionesMaletaConGemini(
    viaje: Viaje,
    prendas: Prenda[],
    clima: any,
    estacion: string,
    generarMaletaDto: GenerarMaletaDto,
  ): Promise<any[]> {
    try {
      console.log('📤 Enviando solicitud a Gemini para generar maleta...');

      const diasViaje = this.calcularDiasViaje(viaje.fechaInicio, viaje.fechaFin);
      const cantidadOutfits =
        generarMaletaDto.cantidadOutfits || Math.max(3, Math.ceil(diasViaje / 2));

      // ✅ Calcular tipo de maleta automáticamente
      const tipoMaletaCalculado = this.calcularTipoMaleta(
        diasViaje,
        viaje.actividades || [],
        clima,
      );
      console.log(`🧳 Tipo de maleta calculado: ${tipoMaletaCalculado}`);

      // Guardar el tipo de maleta calculado en el viaje
      viaje.tipoMaletaCalculado = tipoMaletaCalculado;

      // Preparar lista de prendas
      const listaPrendas = prendas
        .map(
          (p, i) =>
            `${i + 1}. ${p.nombre} (tipo: ${p.tipo}, color: ${p.color}, sección: ${p.seccion}, estación: ${p.estacion})`,
        )
        .join('\n');

      const prompt = `Eres un experto en moda y empaque de maletas. Necesito que ayudes al usuario a preparar su maleta para un viaje.

========== INFORMACIÓN DEL VIAJE ==========
Destino: ${viaje.destino}
Ubicación: ${viaje.ciudad || viaje.destino}
Duración: ${diasViaje} días
Fechas: ${viaje.fechaInicio} a ${viaje.fechaFin}
Transporte: ${viaje.transporte}
Actividades: ${viaje.actividades?.join(', ') || 'No especificadas'}

========== INFORMACIÓN DEL CLIMA ==========
Temperatura: ${clima.temperatura}°C
Condición: ${clima.condicion}
Estación: ${estacion}

========== INFORMACIÓN DE LA MALETA ==========
Tipo/Capacidad: ${tipoMaletaCalculado} (calculado automáticamente)
Cantidad de outfits a generar: ${cantidadOutfits}

========== PRENDAS DISPONIBLES ==========
${listaPrendas}

========== INSTRUCCIONES ==========

Genera EXACTAMENTE ${cantidadOutfits} recomendaciones variadas para empacar. Cada recomendación puede ser:

1. **UN OUTFIT COMPLETO** (ropa coordinada para un día):
   - 2-4 prendas que combinen bien
   - Apropiadas para el clima y actividades
   - Tipo: "outfit_completo"

2. **PRENDAS SUELTAS** (ítems esenciales):
   - Ropa interior (especificar cantidad)
   - Calcetines, medias
   - Pijamas
   - Accesorios (bolsos, cinturones, gafas)
   - Prendas de abrigo adicionales
   - Tipo: "prendas_sueltas"

Reglas:
- Combina outfits coordinados con prendas sueltas en proporción 60/40
- Considera la DURACIÓN del viaje (${diasViaje} días)
- Adapta al CLIMA (${clima.temperatura}°C)
- Prioriza las ACTIVIDADES planeadas: ${viaje.actividades?.join(', ') || 'variadas'}
- Para maleta ${tipoMaletaCalculado}: adapta cantidad de prendas
- Sé inteligente: no repitas prendas en múltiples outfits, combina diferente
- Incluye siempre prendas versátiles que combinen con muchas otras

Responde SOLO con un JSON array de ${cantidadOutfits} recomendaciones:
[
  {
    "tipo": "outfit_completo|prendas_sueltas",
    "nombre": "nombre descriptivo (ej: Outfit casual para playa, Prendas básicas, etc)",
    "categoria": "casual|formal|deporte|elegante",
    "cantidad": 1,
    "prendas": ["nombre prenda 1", "nombre prenda 2", ...],
    "descripcion": "breve descripción de para qué sirven estas prendas"
  }
]

IMPORTANTE:
- Devuelve SOLO el JSON, sin explicaciones
- Usa los nombres EXACTOS de las prendas disponibles
- Si no encuentras una prenda similar, adapta con lo disponible
- Cada prenda debe ser del usuario (no inventes prendas)`;

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

      console.log(
        '📝 Respuesta de Gemini (primeros 300 chars):',
        responseText.substring(0, 300),
      );

      // Parsear JSON
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        console.error('❌ No se encontró JSON en la respuesta');
        throw new Error('Respuesta inválida de Gemini');
      }

      const recomendaciones = JSON.parse(jsonMatch[0]);
      console.log(`✅ ${recomendaciones.length} recomendaciones parseadas`);

      return recomendaciones;
    } catch (error: any) {
      console.error('❌ ERROR en generarRecomendacionesMaletaConGemini:', error.message);
      throw error;
    }
  }

  private async crearMaletaOutfitDesdeRecomendacion(
    recomendacion: any,
    viaje: Viaje,
    prendasDisponibles: Prenda[],
  ): Promise<MaletaOutfit> {
    // Mapear nombres de prendas a objetos
    const prendasDelOutfit = recomendacion.prendas
      .map((nombrePrenda: string) =>
        prendasDisponibles.find(
          (p) => p.nombre.toLowerCase() === nombrePrenda.toLowerCase(),
        ),
      )
      .filter((p: any) => p !== undefined);

    const maletaOutfit = this.maletaOutfitRepository.create({
      nombre: recomendacion.nombre,
      categoria: recomendacion.categoria || 'casual',
      tipo: recomendacion.tipo || 'outfit_completo',
      cantidad: recomendacion.cantidad || 1,
      notas: recomendacion.descripcion,
      empacado: false,
      viaje,
      prendas: prendasDelOutfit,
    });

    return await this.maletaOutfitRepository.save(maletaOutfit);
  }

  // ============================================================
  // GESTIÓN DE MALETA (ACTUALIZAR, ELIMINAR)
  // ============================================================

  async obtenerMaletaViaje(viajeId: string, usuario: User): Promise<MaletaOutfit[]> {
    const viaje = await this.obtenerViajePorId(viajeId, usuario);

    return await this.maletaOutfitRepository.find({
      where: { viaje: { id: viaje.id } },
      relations: ['prendas'],
      order: { createdAt: 'ASC' },
    });
  }

  async crearMaletaOutfit(
    viajeId: string,
    usuario: User,
    createMaletaOutfitDto: CreateMaletaOutfitDto,
  ): Promise<MaletaOutfit> {
    try {
      const viaje = await this.obtenerViajePorId(viajeId, usuario);

      // Validar que existan las prendas
      const prendas = await this.prendaRepository.find({
        where: {
          id: In(createMaletaOutfitDto.prendasIds),
          usuario: { id: usuario.id }, // Solo prendas del usuario
        },
      });

      if (prendas.length !== createMaletaOutfitDto.prendasIds.length) {
        throw new BadRequestException(
          'Una o más prendas no existen o no pertenecen al usuario',
        );
      }

      // Crear MaletaOutfit
      const maletaOutfit = this.maletaOutfitRepository.create({
        nombre: createMaletaOutfitDto.nombre,
        categoria: createMaletaOutfitDto.categoria || 'casual',
        tipo: createMaletaOutfitDto.tipo || 'outfit_completo',
        cantidad: createMaletaOutfitDto.cantidad || 1,
        notas: createMaletaOutfitDto.notas,
        empacado: false,
        viaje,
        prendas,
      });

      return await this.maletaOutfitRepository.save(maletaOutfit);
    } catch (error) {
      throw new BadRequestException(
        `Error al crear outfit en maleta: ${error.message}`,
      );
    }
  }

  async actualizarMaletaOutfit(
    viajeId: string,
    maletaId: string,
    usuario: User,
    updateMaletaDto: UpdateMaletaOutfitDto,
  ): Promise<MaletaOutfit> {
    const viaje = await this.obtenerViajePorId(viajeId, usuario);

    const maletaOutfit = await this.maletaOutfitRepository.findOne({
      where: { id: maletaId, viaje: { id: viaje.id } },
      relations: ['prendas'],
    });

    if (!maletaOutfit) {
      throw new NotFoundException('Item de maleta no encontrado');
    }

    Object.assign(maletaOutfit, updateMaletaDto);

    return await this.maletaOutfitRepository.save(maletaOutfit);
  }

  async eliminarMaletaOutfit(
    viajeId: string,
    maletaId: string,
    usuario: User,
  ): Promise<void> {
    const viaje = await this.obtenerViajePorId(viajeId, usuario);

    const maletaOutfit = await this.maletaOutfitRepository.findOne({
      where: { id: maletaId, viaje: { id: viaje.id } },
    });

    if (!maletaOutfit) {
      throw new NotFoundException('Item de maleta no encontrado');
    }

    await this.maletaOutfitRepository.remove(maletaOutfit);
  }

  // ============================================================
  // UTILIDADES
  // ============================================================

  private calcularTipoMaleta(
    diasViaje: number,
    actividades: string[],
    clima: any,
  ): string {
    let score = 0;

    // Factor 1: Duración
    if (diasViaje <= 3) score += 1;
    else if (diasViaje <= 7) score += 2;
    else score += 3;

    // Factor 2: Cantidad de actividades
    const numActividades = actividades?.length || 0;
    if (numActividades <= 2) score += 1;
    else if (numActividades <= 4) score += 2;
    else score += 3;

    // Factor 3: Clima (ropa de abrigo = más volumen)
    if (clima.temperatura < 5) score += 2; // Frío extremo
    else if (clima.temperatura < 15) score += 1; // Frío moderado
    else if (clima.temperatura > 28) score += 1; // Calor (menos prendas pero más ligeras)

    // Determinar tipo de maleta
    if (score <= 3) return 'pequeña';
    if (score <= 5) return 'mediana';
    return 'grande';
  }

  private calcularDiasViaje(fechaInicio: any, fechaFin: any): number {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24)) + 1;
  }

  private calcularEstacionPorUbicacion(
    fecha: any,
    ciudad?: string,
  ): string {
    const fecha_obj = new Date(fecha);
    const mes = fecha_obj.getMonth() + 1;

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

    if (!esSur) {
      if (mes >= 3 && mes <= 5) return 'primavera';
      if (mes >= 6 && mes <= 8) return 'verano';
      if (mes >= 9 && mes <= 11) return 'otoño';
      return 'invierno';
    }

    if (mes >= 3 && mes <= 5) return 'otoño';
    if (mes >= 6 && mes <= 8) return 'invierno';
    if (mes >= 9 && mes <= 11) return 'primavera';
    return 'verano';
  }

  private async obtenerClimaParaUbicacion(ciudad: string): Promise<any> {
    try {
      console.log(`🌍 Obteniendo clima para ${ciudad}...`);

      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          ciudad,
        )}&count=1`,
      );

      const geoData: any = await geoResponse.json();

      if (!geoData?.results || geoData.results.length === 0) {
        console.log(`⚠️ Ciudad no encontrada, usando default`);
        return { temperatura: 20, condicion: 'Desconocido', codigo: 0 };
      }

      const { latitude, longitude } = geoData.results[0];

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

      console.log(`✅ Clima: ${temperatura}°C, ${condicion}`);

      return { temperatura, condicion, codigo };
    } catch (error) {
      console.error('❌ Error obteniendo clima:', error);
      return { temperatura: 20, condicion: 'Desconocido', codigo: 0 };
    }
  }
}