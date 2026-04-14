import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  // ─────────────────── register ───────────────────
  describe('register', () => {
    it('deve criar novo usuário e retornar token JWT', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'novo@email.com',
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await service.register({ email: 'novo@email.com', password: 'senha123' });

      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.email).toBe('novo@email.com');
    });

    it('deve lançar ConflictException se e-mail já está em uso', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.register({ email: 'existente@email.com', password: '123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve fazer hash da senha antes de salvar', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }) => ({
        id: '1',
        email: data.email,
        role: 'USER',
        createdAt: new Date(),
      }));

      await service.register({ email: 'a@a.com', password: 'plaintext' });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).toBeDefined();
      expect(createCall.data.passwordHash).not.toBe('plaintext');
    });
  });

  // ─────────────────── login ───────────────────
  describe('login', () => {
    it('deve retornar token com credenciais válidas', async () => {
      const hash = await bcrypt.hash('senha123', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'user@email.com',
        passwordHash: hash,
        role: 'USER',
      });

      const result = await service.login({ email: 'user@email.com', password: 'senha123' });

      expect(result.token).toBe('mock.jwt.token');
      expect(result.user.email).toBe('user@email.com');
    });

    it('deve lançar UnauthorizedException se usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'naoexiste@email.com', password: '123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException com senha incorreta', async () => {
      const hash = await bcrypt.hash('certa', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash: hash,
      });

      await expect(
        service.login({ email: 'a@a.com', password: 'errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('não deve vazar diferença entre "usuário não encontrado" e "senha errada"', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      let msg1 = '';
      try { await service.login({ email: 'x@x.com', password: '123' }); } catch (e: any) { msg1 = e.message; }

      const hash = await bcrypt.hash('correta', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', passwordHash: hash });
      let msg2 = '';
      try { await service.login({ email: 'x@x.com', password: 'errada' }); } catch (e: any) { msg2 = e.message; }

      expect(msg1).toBe(msg2);
    });
  });
});
