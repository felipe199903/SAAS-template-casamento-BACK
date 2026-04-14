import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockTx = {
  payment: { deleteMany: jest.fn().mockResolvedValue({}) },
  purchase: { deleteMany: jest.fn().mockResolvedValue({}) },
  present: { deleteMany: jest.fn().mockResolvedValue({}) },
  wedding: { delete: jest.fn().mockResolvedValue({}) },
};

const mockPrisma = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  wedding: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  purchase: {
    count: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx)),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(AdminService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx));
  });

  // ─────────────────── getStats ───────────────────
  describe('getStats', () => {
    it('deve retornar todas as estatísticas da plataforma', async () => {
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.wedding.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);
      mockPrisma.purchase.count.mockResolvedValue(3);
      mockPrisma.purchase.aggregate.mockResolvedValue({ _sum: { amount: '150.00' } });

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 5,
        totalWeddings: 10,
        paidWeddings: 3,
        pendingWeddings: 7,
        totalPurchases: 3,
        totalRevenue: 150,
      });
    });

    it('deve retornar totalRevenue 0 quando não há compras pagas', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.wedding.count.mockResolvedValue(0);
      mockPrisma.purchase.count.mockResolvedValue(0);
      mockPrisma.purchase.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getStats();

      expect(result.totalRevenue).toBe(0);
      expect(result.pendingWeddings).toBe(0);
    });
  });

  // ─────────────────── listWeddings ───────────────────
  describe('listWeddings', () => {
    it('deve retornar lista paginada sem filtro', async () => {
      const items = [{ id: '1', groomName: 'João', brideName: 'Maria', paid: true }];
      mockPrisma.wedding.findMany.mockResolvedValue(items);
      mockPrisma.wedding.count.mockResolvedValue(1);

      const result = await service.listWeddings({ page: 1, limit: 20 });

      expect(result).toEqual({ items, total: 1, page: 1, limit: 20 });
    });

    it('deve filtrar por status pago', async () => {
      mockPrisma.wedding.findMany.mockResolvedValue([]);
      mockPrisma.wedding.count.mockResolvedValue(0);

      await service.listWeddings({ paid: true, page: 1, limit: 20 });

      expect(mockPrisma.wedding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paid: true } }),
      );
    });

    it('deve calcular skip correto para paginação', async () => {
      mockPrisma.wedding.findMany.mockResolvedValue([]);
      mockPrisma.wedding.count.mockResolvedValue(0);

      await service.listWeddings({ page: 3, limit: 10 });

      expect(mockPrisma.wedding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ─────────────────── listPurchases ───────────────────
  describe('listPurchases', () => {
    it('deve retornar lista paginada de compras', async () => {
      mockPrisma.purchase.findMany.mockResolvedValue([]);
      mockPrisma.purchase.count.mockResolvedValue(0);

      const result = await service.listPurchases({ page: 1, limit: 20 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('deve filtrar por status PAID', async () => {
      mockPrisma.purchase.findMany.mockResolvedValue([]);
      mockPrisma.purchase.count.mockResolvedValue(0);

      await service.listPurchases({ status: 'PAID' as any, page: 1, limit: 20 });

      expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PAID' } }),
      );
    });
  });

  // ─────────────────── listUsers ───────────────────
  describe('listUsers', () => {
    it('deve retornar lista paginada de usuários', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: '1', email: 'a@a.com', role: 'USER' }]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.listUsers({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('deve calcular skip correto para segunda página', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.listUsers({ page: 2, limit: 10 });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10 }),
      );
    });
  });

  // ─────────────────── updateUserRole ───────────────────
  describe('updateUserRole', () => {
    it('deve atualizar o role para ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@a.com' });
      mockPrisma.user.update.mockResolvedValue({ id: '1', email: 'a@a.com', role: Role.ADMIN });

      const result = await service.updateUserRole('1', Role.ADMIN);

      expect(result.role).toBe(Role.ADMIN);
    });

    it('deve lançar NotFoundException se usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserRole('x', Role.ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────── deleteUser ───────────────────
  describe('deleteUser', () => {
    it('deve deletar usuário e retornar mensagem de sucesso', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@a.com' });
      mockPrisma.user.delete.mockResolvedValue({});

      const result = await service.deleteUser('1');

      expect(result.message).toBeTruthy();
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('deve lançar NotFoundException se usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('x')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────── deleteWedding ───────────────────
  describe('deleteWedding', () => {
    it('deve deletar site e todos os dados relacionados (cascade manual)', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: 'w1', groomName: 'João' });
      mockPrisma.purchase.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

      const result = await service.deleteWedding('w1');

      expect(result.message).toBeTruthy();
      expect(mockTx.payment.deleteMany).toHaveBeenCalledWith({
        where: { purchaseId: { in: ['p1', 'p2'] } },
      });
      expect(mockTx.purchase.deleteMany).toHaveBeenCalledWith({ where: { weddingId: 'w1' } });
      expect(mockTx.present.deleteMany).toHaveBeenCalledWith({ where: { weddingId: 'w1' } });
      expect(mockTx.wedding.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
    });

    it('deve deletar site sem compras (sem chamar payment.deleteMany)', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: 'w2' });
      mockPrisma.purchase.findMany.mockResolvedValue([]);

      await service.deleteWedding('w2');

      expect(mockTx.payment.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.present.deleteMany).toHaveBeenCalled();
      expect(mockTx.wedding.delete).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se site não existe', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue(null);

      await expect(service.deleteWedding('x')).rejects.toThrow(NotFoundException);
    });
  });
});
