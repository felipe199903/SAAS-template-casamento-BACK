import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  wedding: { findUnique: jest.fn() },
  purchase: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('PurchasesService', () => {
  let service: PurchasesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PurchasesService);
    jest.clearAllMocks();
  });

  // ─────────────────── create ───────────────────
  describe('create', () => {
    it('deve lançar NotFoundException se casamento não existe', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue(null);

      await expect(
        service.create('u1', { weddingId: 'w-nao-existe' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se casamento não pertence ao usuário', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: 'w1', userId: 'outro', paid: false });

      await expect(
        service.create('u1', { weddingId: 'w1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se site já está pago', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: 'w1', userId: 'u1', paid: true });

      await expect(
        service.create('u1', { weddingId: 'w1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve retornar compra pendente existente (idempotência)', async () => {
      const existingPurchase = { id: 'p1', status: 'PENDING', weddingId: 'w1' };
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: 'w1', userId: 'u1', paid: false });
      mockPrisma.purchase.findFirst.mockResolvedValue(existingPurchase);

      const result = await service.create('u1', { weddingId: 'w1' });

      expect(result).toEqual(existingPurchase);
      expect(mockPrisma.purchase.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se pagamento já foi confirmado', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: 'w1', userId: 'u1', paid: false });
      mockPrisma.purchase.findFirst.mockResolvedValue({ id: 'p1', status: 'PAID' });

      await expect(
        service.create('u1', { weddingId: 'w1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve criar nova compra quando não há compra pendente', async () => {
      const newPurchase = { id: 'p-new', status: 'PENDING' };
      mockPrisma.wedding.findUnique.mockResolvedValue({
        id: 'w1',
        userId: 'u1',
        paid: false,
        groomName: 'João',
        brideName: 'Maria',
      });
      mockPrisma.purchase.findFirst.mockResolvedValue(null);
      mockPrisma.purchase.create.mockResolvedValue(newPurchase);
      mockPrisma.purchase.update.mockResolvedValue(newPurchase);

      // MercadoPago vai falhar em ambiente de teste — o service retorna a compra mesmo assim
      const result = await service.create('u1', { weddingId: 'w1' });

      expect(result.id).toBe('p-new');
      expect(mockPrisma.purchase.create).toHaveBeenCalled();
    });
  });

  // ─────────────────── getStatus ───────────────────
  describe('getStatus', () => {
    it('deve retornar status da compra', async () => {
      mockPrisma.purchase.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'u1',
        status: 'PENDING',
      });

      const result = await service.getStatus('u1', 'p1');

      expect(result.status).toBe('PENDING');
      expect(result.id).toBe('p1');
    });

    it('deve lançar NotFoundException se compra não existe', async () => {
      mockPrisma.purchase.findUnique.mockResolvedValue(null);

      await expect(service.getStatus('u1', 'p-nao-existe')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se compra pertence a outro usuário', async () => {
      mockPrisma.purchase.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'outro-usuario',
        status: 'PAID',
      });

      await expect(service.getStatus('u1', 'p1')).rejects.toThrow(BadRequestException);
    });
  });
});
