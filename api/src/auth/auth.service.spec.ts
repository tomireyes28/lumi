import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let jwtService: {
    sign: jest.Mock;
    verify: jest.Mock;
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret_key';

    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
      verify: jest.fn().mockReturnValue({ sub: 'user-123', email: 'test@example.com' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('OAuth Exchange Flow (Anti-URL Leakage & Anti-Replay)', () => {
    it('should generate an exchange code, exchange it once, and burn it on replay', async () => {
      const token = 'valid-jwt-token';
      const code = service.createOAuthExchangeCode(token);
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(10);

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        picture: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Primer canje: debe ser exitoso
      const result = await service.exchangeOAuthCode(code);
      expect(result).toEqual({
        token,
        user: mockUser,
      });

      // Segundo canje (ataque de replay): el código ya fue quemado, debe fallar
      await expect(service.exchangeOAuthCode(code)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if code does not exist', async () => {
      await expect(service.exchangeOAuthCode('non-existent-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Register', () => {
    it('should register a new user with hashed password and return token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_secret_password');

      const mockCreatedUser = {
        id: 'user-new',
        name: 'Jane Doe',
        email: 'jane@example.com',
        picture: null,
      };
      prisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123!',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(result).toHaveProperty('token', 'mocked-jwt-token');
      expect(result.user.email).toBe('jane@example.com');
    });

    it('should throw BadRequestException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-existing', email: 'jane@example.com' });

      await expect(
        service.register({
          name: 'Jane',
          email: 'jane@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Login', () => {
    it('should return token and user for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Jane',
        email: 'jane@example.com',
        password: 'hashed_password',
        picture: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'jane@example.com',
        password: 'correct_password',
      });

      expect(result).toHaveProperty('token', 'mocked-jwt-token');
      expect(result.user.id).toBe('user-1');
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Jane',
        email: 'jane@example.com',
        password: 'hashed_password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'jane@example.com',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user registered via Google (no password set)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-google',
        email: 'googleuser@example.com',
        password: null,
      });

      await expect(
        service.login({
          email: 'googleuser@example.com',
          password: 'some_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
