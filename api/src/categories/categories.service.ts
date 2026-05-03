import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string) {
    await this.getCategoryOrThrow(id, userId); 
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.getCategoryOrThrow(id, userId); 

    // VALIDACIÓN DE SEGURIDAD PARA TRANSACCIONES HUÉRFANAS
    const txCount = await this.prisma.transaction.count({
      where: { categoryId: id }
    });

    if (txCount > 0) {
      throw new BadRequestException(`No podés borrar esta categoría porque tiene ${txCount} movimientos asociados. Editala o borrá los gastos primero.`);
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}