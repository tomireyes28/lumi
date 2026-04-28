import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegurate de que la ruta sea correcta
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  // Inyectamos nuestro PrismaService
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        type: createCategoryDto.type,       
        colorHex: createCategoryDto.colorHex, 
        icon: createCategoryDto.icon,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' }, // Las traemos ordenadas alfabéticamente
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string) {
    // Primero verificamos que la categoría exista y pertenezca a este usuario
    const category = await this.prisma.category.findUnique({ where: { id } });
    
    if (!category || category.userId !== userId) {
      throw new NotFoundException('Categoría no encontrada o no autorizada');
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, userId: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    
    if (!category || category.userId !== userId) {
      throw new NotFoundException('Categoría no encontrada o no autorizada');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}