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
  constructor(
    @InjectRepository(Outfit)
    private readonly outfitRepository: Repository<Outfit>,
    @InjectRepository(Prenda)
    private readonly prendaRepository: Repository<Prenda>,
  ) {}

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
        throw new BadRequestException('Una o más prendas no existen o no pertenecen al usuario');
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
    if (updateOutfitDto.prendasIds && Array.isArray(updateOutfitDto.prendasIds) && updateOutfitDto.prendasIds.length > 0) {
      const prendas = await this.prendaRepository.find({
        where: {
          id: In(updateOutfitDto.prendasIds),
          usuario: { id: usuario.id },
        },
      });

      if (prendas.length !== updateOutfitDto.prendasIds.length) {
        throw new BadRequestException('Una o más prendas no existen o no pertenecen al usuario');
      }

      outfit.prendas = prendas;
    }

    // Actualizar otros campos (solo si vienen en el request)
    if (updateOutfitDto.nombre !== undefined) outfit.nombre = updateOutfitDto.nombre;
    if (updateOutfitDto.imagen !== undefined) outfit.imagen = updateOutfitDto.imagen;
    if (updateOutfitDto.categoria !== undefined) outfit.categoria = updateOutfitDto.categoria;
    if (updateOutfitDto.estacion !== undefined) outfit.estacion = updateOutfitDto.estacion;

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