import { serializable } from '../utils/serializable.util';
import { ownedCategory } from '../utils/category-lock.util';
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

  async update(id: string, dto: UpdateCategoryDto, userId: string) {
    return serializable(this.prisma, async (tx) => {
      const existing = await ownedCategory(tx, id, userId);
      if (!existing)
        throw new NotFoundException('Categoría no encontrada o no autorizada');
      if (dto.type !== undefined && String(dto.type) !== existing.type) {
        const [movements, budgets] = await Promise.all([
          tx.transaction.count({ where: { categoryId: id } }),
          tx.budget.count({ where: { categoryId: id } }),
        ]);
        if (movements || budgets)
          throw new BadRequestException(
            'No podés cambiar el tipo de una categoría con movimientos o presupuestos.',
          );
      }
      return tx.category.update({ where: { id }, data: dto });
    });
  }
  async remove(id: string, userId: string) {
    try {
      return await serializable(this.prisma, async (tx) => {
        const existing = await ownedCategory(tx, id, userId);
        if (!existing)
          throw new NotFoundException(
            'Categoría no encontrada o no autorizada',
          );
        const [movements, budgets] = await Promise.all([
          tx.transaction.count({ where: { categoryId: id } }),
          tx.budget.count({ where: { categoryId: id } }),
        ]);
        if (movements || budgets)
          throw new BadRequestException(
            'No podés borrar una categoría con movimientos o presupuestos.',
          );
        return tx.category.delete({ where: { id } });
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2003'
      )
        throw new BadRequestException(
          'La categoría tiene movimientos asociados.',
        );
      throw error;
    }
  }
}
