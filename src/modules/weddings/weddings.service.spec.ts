import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WeddingsService } from './weddings.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  wedding: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('WeddingsService', () => {
  let service: WeddingsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WeddingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(WeddingsService);
    jest.clearAllMocks();
  });

  // ─────────────────── create ───────────────────
  describe('create', () => {
    it('deve criar um casamento com slug gerado a partir dos nomes', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue(null); // slug disponível
      mockPrisma.wedding.create.mockResolvedValue({
        id: '1',
        groomName: 'João',
        brideName: 'Maria',
        slug: 'joao-e-maria',
        userId: 'u1',
      });

      const result = await service.create('u1', { groomName: 'João', brideName: 'Maria' });

      expect(result.slug).toBeTruthy();
      expect(mockPrisma.wedding.create).toHaveBeenCalledTimes(1);
    });

    it('deve incrementar o slug se já existir conflito', async () => {
      mockPrisma.wedding.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // joao-e-maria existe
        .mockResolvedValueOnce(null);              // joao-e-maria-1 disponível
      mockPrisma.wedding.create.mockResolvedValue({ id: '2', slug: 'joao-e-maria-1' });

      await service.create('u1', { groomName: 'João', brideName: 'Maria' });

      expect(mockPrisma.wedding.create).toHaveBeenCalled();
    });
  });

  // ─────────────────── findMine ───────────────────
  describe('findMine', () => {
    it('deve retornar os casamentos do usuário autenticado', async () => {
      const items = [{ id: '1', userId: 'u1' }];
      mockPrisma.wedding.findMany.mockResolvedValue(items);

      const result = await service.findMine('u1');

      expect(result).toEqual(items);
      expect(mockPrisma.wedding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
    });
  });

  // ─────────────────── findBySlug ───────────────────
  describe('findBySlug', () => {
    it('deve retornar casamento encontrado pelo slug', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', slug: 'joao-e-maria' });

      const result = await service.findBySlug('joao-e-maria');

      expect(result.slug).toBe('joao-e-maria');
    });

    it('deve lançar NotFoundException para slug inexistente', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────── updatePix ───────────────────
  describe('updatePix', () => {
    it('deve lançar BadRequestException se site não está pago', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', userId: 'u1', paid: false });

      await expect(
        service.updatePix('u1', '1', { pixKey: '12345678901', pixKeyType: 'cpf' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar ForbiddenException se usuário não é o dono', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', userId: 'outro-user', paid: true });

      await expect(
        service.updatePix('u1', '1', { pixKey: '123', pixKeyType: 'email' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve atualizar chave PIX do site pago', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', userId: 'u1', paid: true });
      mockPrisma.wedding.update.mockResolvedValue({ id: '1', pixKey: '12345678901', pixKeyType: 'cpf' });

      const result = await service.updatePix('u1', '1', { pixKey: '12345678901', pixKeyType: 'cpf' });

      expect(result.pixKey).toBe('12345678901');
    });

    it('deve lançar BadRequestException para e-mail PIX inválido', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', userId: 'u1', paid: true });

      await expect(
        service.updatePix('u1', '1', { pixKey: 'invalido', pixKeyType: 'email' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────── setPublished ───────────────────
  describe('setPublished', () => {
    it('deve lançar BadRequestException ao tentar publicar site não pago', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', userId: 'u1', paid: false });

      await expect(
        service.setPublished('u1', '1', { published: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve permitir despublicar mesmo sem pagamento', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', userId: 'u1', paid: false });
      mockPrisma.wedding.update.mockResolvedValue({ id: '1', published: false });

      const result = await service.setPublished('u1', '1', { published: false });

      expect(result.published).toBe(false);
    });

    it('deve publicar site pago', async () => {
      mockPrisma.wedding.findUnique.mockResolvedValue({ id: '1', userId: 'u1', paid: true });
      mockPrisma.wedding.update.mockResolvedValue({ id: '1', published: true });

      const result = await service.setPublished('u1', '1', { published: true });

      expect(result.published).toBe(true);
    });
  });
});
