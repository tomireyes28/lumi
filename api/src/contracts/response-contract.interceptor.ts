import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import type { Request } from 'express';
import { parseHttpResponse, responseSchema } from './http';

@Injectable()
export class ResponseContractInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseContractInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler<unknown>) {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.originalUrl ?? request.url;
    if (!responseSchema(path, request.method, 'api')) return next.handle();
    return next.handle().pipe(
      map((value: unknown) => {
        try {
          // Validate the actual wire representation of Date and Prisma.Decimal.
          const payload: unknown = JSON.parse(JSON.stringify(value));
          parseHttpResponse(path, request.method, payload, 'api');
          return value;
        } catch {
          this.logger.error('response_contract_failed');
          throw new InternalServerErrorException(
            'No se pudo construir una respuesta válida. Reintentá la consulta.',
          );
        }
      }),
    );
  }
}
