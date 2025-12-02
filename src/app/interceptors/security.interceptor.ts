import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

/**
 * Interceptor de Segurança
 * 
 * Implementa proteções contra:
 * - XSS (Cross-Site Scripting)
 * - Injeção de código
 * - Vazamento de informações sensíveis
 * 
 * OWASP Guidelines implementadas:
 * - A3:2017 - Sensitive Data Exposure
 * - A7:2017 - Cross-Site Scripting (XSS)
 */
export const securityInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  // Sanitiza o corpo da requisição se for POST/PUT/PATCH
  let sanitizedReq = req;
  
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = sanitizeRequestBody(req.body);
    sanitizedReq = req.clone({ body: sanitizedBody });
  }

  return next(sanitizedReq).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          // Valida response para dados sensíveis expostos
          validateResponseSecurity(event);
        }
      }
    })
  );
};

/**
 * Sanitiza o corpo da requisição para prevenir XSS
 */
function sanitizeRequestBody(body: any): any {
  if (body === null || body === undefined) return body;
  
  if (typeof body === 'string') {
    return sanitizeString(body);
  }
  
  if (Array.isArray(body)) {
    return body.map(item => sanitizeRequestBody(item));
  }
  
  if (body instanceof FormData) {
    // FormData não pode ser clonado diretamente, retorna como está
    return body;
  }
  
  if (typeof body === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(body)) {
      sanitized[key] = sanitizeRequestBody(body[key]);
    }
    return sanitized;
  }
  
  return body;
}

/**
 * Sanitiza strings contra XSS
 */
function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  
  // Remove tags HTML potencialmente perigosas
  const dangerousTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  const onEventHandlers = /\bon\w+\s*=/gi;
  const javascriptUrls = /javascript:/gi;
  const dataUrls = /data:text\/html/gi;
  
  return str
    .replace(dangerousTags, '')
    .replace(onEventHandlers, '')
    .replace(javascriptUrls, '')
    .replace(dataUrls, '');
}

/**
 * Valida a resposta para detectar possíveis vazamentos de dados sensíveis
 */
function validateResponseSecurity(response: HttpResponse<any>): void {
  if (!response.body) return;
  
  const sensitiveFields = [
    'password',
    'passwordHash',
    'secret',
    'apiKey',
    'privateKey',
    'creditCard',
    'cvv',
    'ssn'
  ];
  
  const bodyStr = JSON.stringify(response.body).toLowerCase();
  
  for (const field of sensitiveFields) {
    if (bodyStr.includes(`"${field.toLowerCase()}":`)) {
      console.warn(
        `[SecurityInterceptor] ⚠️ Possível vazamento de dado sensível detectado: "${field}" na resposta de ${response.url}`
      );
    }
  }
}

