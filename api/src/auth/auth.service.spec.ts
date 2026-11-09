import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OAuthStateStore } from './strategies/oauth-state.store';
import type { Request } from 'express';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    authSession: {
      create: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
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
      authSession: {
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
      verify: jest
        .fn()
        .mockReturnValue({ sub: 'user-123', email: 'test@example.com' }),
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

  describe('OAuth Exchange Flow (Anti-URL Leakage, Anti-Replay & Anti-CSRF)', () => {
    it('should generate an exchange code, exchange it once, and burn it on replay', async () => {
      const token = 'valid-jwt-token';
      const code = service.createOAuthExchangeCode(token, 'browser-state-123');
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(10);

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'test@example.com',
        picture: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Primer canje con el state correspondiente: debe ser exitoso
      const result = await service.exchangeOAuthCode(code, 'browser-state-123');
      expect(result).toEqual({
        token,
        user: mockUser,
      });

      // Segundo canje (ataque de replay): el código ya fue quemado, debe fallar
      await expect(
        service.exchangeOAuthCode(code, 'browser-state-123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject and burn code if clientState does not match originating browser', async () => {
      const code = service.createOAuthExchangeCode(
        'valid-jwt-token',
        'origin-browser-nonce',
      );

      await expect(
        service.exchangeOAuthCode(code, 'attacker-browser-nonce'),
      ).rejects.toThrow(UnauthorizedException);
      // El código queda invalidado tras el intento fallido
      await expect(
        service.exchangeOAuthCode(code, 'origin-browser-nonce'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if code does not exist', async () => {
      await expect(
        service.exchangeOAuthCode('non-existent-code'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Google Login & Pre-Account Takeover Protection', () => {
    it('should invalidate unverified local password when linking Google account with same email', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'victim@example.com',
        password: 'attacker-pre-registered-hash',
        emailVerified: false,
      });
      prisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        email: 'victim@example.com',
        password: null,
        emailVerified: true,
        googleId: 'google-sub-123',
      });

      await service.googleLogin({
        googleId: 'google-sub-123',
        email: 'victim@example.com',
        emailVerified: true,
        name: 'Real Owner',
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            password: null,
            emailVerified: true,
            googleId: 'google-sub-123',
          }) as unknown,
        }),
      );
    });

    it('should reject Google login if email is not verified by provider', async () => {
      await expect(
        service.googleLogin({
          email: 'unverified@example.com',
          emailVerified: false,
          name: 'Unverified',
        }),
      ).rejects.toThrow(UnauthorizedException);
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
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-existing',
        email: 'jane@example.com',
      });

      await expect(
        service.register({
          name: 'Jane',
          email: 'jane@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject passwords exceeding 72 UTF-8 bytes even if character length <= 72', async () => {
      const multibytePassword = 'é'.repeat(36) + 'A'; // 37 chars, 73 bytes UTF-8
      await expect(
        service.register({
          name: 'Jane',
          email: 'jane@example.com',
          password: multibytePassword,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Login & Token Revocation', () => {
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

    it('persists logout and rejects legacy tokens', async () => {
      prisma.authSession.findUnique.mockResolvedValue(null);
      expect(await service.isTokenRevoked('missing')).toBe(true);
      await service.revokeToken('active');
      expect(prisma.authSession.updateMany).toHaveBeenCalled();
      await expect(
        service.validateSession({
          sub: 'user-1',
          email: 'test@example.invalid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('OAuthStateStore (Anti-Login CSRF & PKCE)', () => {
    it('should sign state, bind HttpOnly cookie, verify PKCE verifier, and block replay', () => {
      const store = new OAuthStateStore('hmac_secret_test', false);
      let setCookieHeader = '';

      const mockReqStore = {
        query: { client_state: 'browser-state-123' },
        res: {
          setHeader: (_name: string, val: string) => {
            setCookieHeader = val;
          },
          getHeader: () => undefined,
        },
      } as unknown as Request;

      let generatedState = '';
      store.store(
        mockReqStore,
        'pkce-code-verifier-xyz',
        undefined,
        undefined,
        (err, state) => {
          expect(err).toBeNull();
          generatedState = state || '';
        },
      );

      expect(generatedState).toContain('.');
      expect(setCookieHeader).toContain('lumi_oauth_state=');

      const cookiePair = setCookieHeader.split(';')[0];
      const mockReqVerify = {
        headers: { cookie: cookiePair },
        res: {
          setHeader: jest.fn(),
          getHeader: () => undefined,
        },
      } as unknown as Request & { oauthClientState?: string };

      // 1ra verificación exitosa
      store.verify(
        mockReqVerify,
        generatedState,
        undefined,
        (err, ok, stateOrVerifier) => {
          expect(err).toBeNull();
          expect(ok).toBe('pkce-code-verifier-xyz');
          expect(stateOrVerifier).toBe('browser-state-123');
        },
      );
      expect(mockReqVerify.oauthClientState).toBe('browser-state-123');

      // 2da verificación del mismo state debe fallar (anti-replay)
      store.verify(mockReqVerify, generatedState, undefined, (_err, ok) => {
        expect(ok).toBe(false);
      });

      // Sin cookie de navegador (ataque Login CSRF) debe fallar
      const csrfReq = { headers: {} } as unknown as Request;
      store.verify(csrfReq, generatedState, undefined, (_err, ok) => {
        expect(ok).toBe(false);
      });
    });
  });
});
