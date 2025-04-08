import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((result: any) => {
        const statusCode = response.statusCode;
        const message = result?.message ?? 'Success';
        const data = result?.data ?? result;
        const meta = result?.meta ?? null;

        return { statusCode, message, data, meta };
      })
    );
  }
}
