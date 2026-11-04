import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCategoryOrThrow(id: string, userId: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== userId) {
      throw new NotFoundException('Categoría no encontrada o no autorizada');
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        type: createCategoryDto.type,
        colorHex: createCategoryDto.colorHex,
        icon: createCategoryDto.icon,
        user: { connect: { id: userId } },
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ) {
    const existing = await this.getCategoryOrThrow(id, userId);

    if (
      updateCategoryDto.type !== undefined &&
      String(updateCategoryDto.type) !== String(existing.type)
    ) {
      const [txCount, budgetCount] = await Promise.all([
        typeof this.prisma.transaction?.count === 'function'
          ? this.prisma.transaction.count({ where: { categoryId: id } })
          : Promise.resolve(0),
        typeof this.prisma.budget?.count === 'function'
          ? this.prisma.budget.count({ where: { categoryId: id } })
          : Promise.resolve(0),
      ]);

      if (txCount > 0 || budgetCount > 0) {
        throw new BadRequestException(
          'No podés cambiar el tipo (ingreso/gasto) de una categoría que ya tiene movimientos o presupuestos asociados.',
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.getCategoryOrThrow(id, userId);

    // VALIDACIÓN DE SEGURIDAD PARA TRANSACCIONES HUÉRFANAS
    const txCount = await this.prisma.transaction.count({
      where: { categoryId: id },
    });

    if (txCount > 0) {
      throw new BadRequestException(
        `No podés borrar esta categoría porque tiene ${txCount} movimientos asociados. Editala o borrá los gastos primero.`,
      );
    }

    try {
      return await this.prisma.category.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2003'
      ) {
        throw new BadRequestException(
          'No podés borrar esta categoría porque tiene movimientos asociados.',
        );
      }
      throw error;
    }
  }
}
