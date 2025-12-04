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
 * - Trata erros de autenticação (401)
 * - NÃO redireciona no 403 (deixa o componente tratar)
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  
  // Recupera token do storage (usa chave com prefixo se existir)
  const token = localStorage.getItem('vea_token') || localStorage.getItem('token');
  const companyId = localStorage.getItem('vea_companyId') || localStorage.getItem('companyId');

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

  // Se já tem header Authorization na requisição original, não sobrescreve
  const hasAuthHeader = req.headers.has('Authorization');

  // Monta os headers
  const headers: { [key: string]: string } = {
    'X-Content-Type-Options': 'nosniff',
    'X-Requested-With': 'XMLHttpRequest'
  };

  // Adiciona Content-Type para métodos que não são GET (se não tiver)
  if (req.method !== 'GET' && !req.headers.has('Content-Type')) {
    // Não adiciona Content-Type para FormData (deixa o browser setar o boundary)
    if (!(req.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
  }

  // Adiciona Authorization se tiver token, não for URL pública, e não tiver header já
  if (token && !isPublicUrl && !hasAuthHeader) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Adiciona CompanyId se existir
  if (companyId) {
    headers['CompanyId'] = companyId;
  }

  // Clona a requisição com os novos headers
  const modifiedReq = req.clone({ setHeaders: headers });

  // Debug: Log da requisição
  console.log('[AuthInterceptor] Request:', {
    url: modifiedReq.url,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 50) + '...' : 'N/A',
    hasAuthHeader: modifiedReq.headers.has('Authorization'),
    authHeader: modifiedReq.headers.get('Authorization')?.substring(0, 60) + '...',
    isPublicUrl,
    companyId
  });

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('[AuthInterceptor] Erro na requisição:', {
        status: error.status,
        url: error.url,
        message: error.message
      });

      // 401: Apenas loga, NÃO limpa token nem redireciona (debug)
      if (error.status === 401) {
        console.warn('[AuthInterceptor] 401 - Token enviado?', !!token);
        console.warn('[AuthInterceptor] 401 - Auth header presente na req?', modifiedReq.headers.has('Authorization'));
        // NÃO redireciona automaticamente - deixa o componente decidir
      }

      // 403: Apenas loga
      if (error.status === 403) {
        console.warn('[AuthInterceptor] 403 - Acesso negado - URL:', error.url);
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
