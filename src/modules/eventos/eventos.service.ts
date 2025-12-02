import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evento } from '../../entities/evento.entity';
import { User } from '../../entities/user.entity';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Injectable()
export class EventosService {
  constructor(
    @InjectRepository(Evento)
    private readonly eventoRepository: Repository<Evento>,
  ) {}

  /**
   * Crear nuevo evento
   */
 async crearEvento(
  createEventoDto: CreateEventoDto,
  usuario: User,
): Promise<Evento> {
  try {
    console.log("📋 Datos recibidos en crearEvento:", createEventoDto);
    
    const evento = this.eventoRepository.create({
      nombre: createEventoDto.nombre,
      fecha: createEventoDto.fecha,
      descripcion: createEventoDto.descripcion,
      tipo: createEventoDto.tipo,
      ubicacion: createEventoDto.ubicacion,
      ciudad: createEventoDto.ciudad,
      usuario,
    });

    console.log("🎉 Evento a guardar:", evento);
    
    const resultado = await this.eventoRepository.save(evento);
    
    console.log("✅ Evento guardado en BD:", resultado);
    
    return resultado;
  } catch (error) {
    throw new BadRequestException(`Error al crear evento: ${error.message}`);
  }
}

  /**
   * Obtener todos los eventos del usuario
   */
  async obtenerEventos(usuario: User): Promise<Evento[]> {
    return await this.eventoRepository.find({
      where: { usuario: { id: usuario.id } },
      order: { fecha: 'ASC' },
    });
  }

  /**
   * Obtener evento por ID
   */
  async obtenerEventoPorId(id: string, usuario: User): Promise<Evento> {
    const evento = await this.eventoRepository.findOne({
      where: { id, usuario: { id: usuario.id } },
    });

    if (!evento) {
      throw new BadRequestException('Evento no encontrado');
    }

    return evento;
  }

  /**
   * Actualizar evento
   */
  async actualizarEvento(
    id: string,
    updateEventoDto: UpdateEventoDto,
    usuario: User,
  ): Promise<Evento> {
    const evento = await this.obtenerEventoPorId(id, usuario);
    Object.assign(evento, updateEventoDto);
    return await this.eventoRepository.save(evento);
  }

  /**
   * Eliminar evento
   */
  async eliminarEvento(id: string, usuario: User): Promise<void> {
    const evento = await this.obtenerEventoPorId(id, usuario);
    await this.eventoRepository.remove(evento);
  }

  /**
   * Obtener eventos filtrados por fecha
   */
  async obtenerEventosPorFecha(
    usuario: User,
    fecha: string,
  ): Promise<Evento[]> {
    return await this.eventoRepository.find({
      where: { usuario: { id: usuario.id }, fecha },
      order: { createdAt: 'DESC' },
    });
  }
}
