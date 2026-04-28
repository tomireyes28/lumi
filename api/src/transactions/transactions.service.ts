import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    return this.prisma.transaction.create({
      data: {
        amount: createTransactionDto.amount,
        note: createTransactionDto.note,
        date: createTransactionDto.date ? new Date(createTransactionDto.date) : new Date(),
        user: { connect: { id: userId } },
        category: { connect: { id: createTransactionDto.categoryId } },
      },
      include: {
        category: true, // Devolvemos la categoría asociada para el frontend
      }
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' }, // Los más recientes primero
      include: {
        category: true, // Traemos el nombre, color e ícono de cada gasto
      },
    });
  }

  async remove(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transacción no encontrada o no autorizada');
    }

    return this.prisma.transaction.delete({
      where: { id },
    });
  }
}