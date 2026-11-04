import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoryType } from './dto/create-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    transaction: {
      count: jest.Mock;
    };
    budget: {
      count: jest.Mock;
    };
  };

  const mockCategory = {
    id: 'cat-1',
    name: 'Supermercado',
    type: 'expense' as const,
    colorHex: '#fb923c',
    icon: 'ShoppingCart',
    userId: 'user-1',
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        count: jest.fn().mockResolvedValue(0),
      },
      budget: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('debe impedir editar una categoría perteneciente a otro usuario (Anti-IDOR)', async () => {
    prisma.category.findUnique.mockResolvedValue({
      ...mockCategory,
      userId: 'other-user',
    });

    await expect(
      service.update('cat-1', { name: 'Hack' }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('debe impedir cambiar el tipo de categoría si ya tiene movimientos o presupuestos asociados', async () => {
    prisma.category.findUnique.mockResolvedValue(mockCategory);
    prisma.transaction.count.mockResolvedValue(4);

    await expect(
      service.update('cat-1', { type: CategoryType.INCOME }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('debe permitir cambiar nombre o color aunque tenga movimientos asociados', async () => {
    prisma.category.findUnique.mockResolvedValue(mockCategory);
    prisma.category.update.mockResolvedValue({
      ...mockCategory,
      name: 'Almacén',
    });

    const updated = await service.update(
      'cat-1',
      { name: 'Almacén' },
      'user-1',
    );
    expect(updated.name).toBe('Almacén');
    expect(prisma.category.update).toHaveBeenCalledTimes(1);
  });

  it('debe impedir eliminar una categoría con transacciones asociadas o ante restricción FK P2003', async () => {
    prisma.category.findUnique.mockResolvedValue(mockCategory);
    prisma.transaction.count.mockResolvedValue(2);

    await expect(service.remove('cat-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );

    prisma.transaction.count.mockResolvedValue(0);
    prisma.category.delete.mockRejectedValue({ code: 'P2003' });

    await expect(service.remove('cat-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
