import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor de Autenticação
 * 
 * Responsabilidades:
 * - Adiciona token de autorização em requisições
 * - Adiciona headers de segurança
 * - Trata erros de autenticação (401, 403)
 * - Redireciona para login quando sessão expira
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  
  // Recupera token do storage (usa chave com prefixo se existir)
  const token = localStorage.getItem('vea_token') || localStorage.getItem('token');
  const companyId = localStorage.getItem('vea_companyId') || localStorage.getItem('companyId') || '';

  // URLs públicas que não precisam de autenticação
  const publicUrls = [
    '/auth/login',
    '/auth/register',
    '/auth/confirm',
    '/auth/check-email',
    '/auth/resend-verification',
    '/companies', // Lista pública
    '/appointments/services',
    '/appointments/employees',
    '/appointments/available-slots',
    '/appointments/agenda-day'
  ];

  const isPublicUrl = publicUrls.some(url => req.url.includes(url));

  // Clona a requisição com headers de segurança
  let modifiedReq = req.clone({
    setHeaders: {
      // Headers de segurança
      'X-Content-Type-Options': 'nosniff',
      'X-Requested-With': 'XMLHttpRequest',
      // Evita MIME type sniffing
      ...(req.method !== 'GET' && { 'Content-Type': req.headers.get('Content-Type') || 'application/json' })
    }
  });

  // Adiciona Authorization se tiver token e não for URL pública
  if (token && !isPublicUrl) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        ...modifiedReq.headers.keys().reduce((acc, key) => ({ ...acc, [key]: modifiedReq.headers.get(key) }), {}),
        'Authorization': `Bearer ${token}`,
        ...(companyId && { 'CompanyId': companyId })
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Trata erros de autenticação
      if (error.status === 401) {
        console.warn('[AuthInterceptor] Sessão expirada ou não autorizado');
        
        // Limpa dados de autenticação
        clearAuthData();
        
        // Redireciona para login
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url, reason: 'session_expired' }
        });
      }

      if (error.status === 403) {
        console.warn('[AuthInterceptor] Acesso negado');
        router.navigate(['/login'], {
          queryParams: { reason: 'access_denied' }
        });
      }

      return throwError(() => error);
    })
  );
};

/**
 * Limpa todos os dados de autenticação do localStorage
 */
function clearAuthData(): void {
  // Chaves com prefixo novo
  localStorage.removeItem('vea_token');
  localStorage.removeItem('vea_user');
  localStorage.removeItem('vea_companyId');
  localStorage.removeItem('vea_role');
  localStorage.removeItem('vea_userId');
  
  // Chaves legadas (sem prefixo)
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('companyId');
}
