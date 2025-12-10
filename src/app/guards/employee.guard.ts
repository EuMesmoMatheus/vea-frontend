import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class EmployeeGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    console.log('[EmployeeGuard] Iniciando verificação...');
    const token = localStorage.getItem('token');
    console.log('[EmployeeGuard] Token encontrado?', !!token);
    
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        console.log('[EmployeeGuard] Token decodificado:', decoded);
        console.log('[EmployeeGuard] Role no token:', decoded?.role);
        
        // Verifica se a role é Employee (case insensitive para segurança)
        if (decoded && (decoded.role === 'Employee' || decoded.role === 'employee')) {
          console.log('[EmployeeGuard] APROVADO - Role OK');
          return true;
        } else {
          console.warn('[EmployeeGuard] REJEITADO - Role não é Employee (é:', decoded?.role, ')');
        }
      } catch (error) {
        console.error('[EmployeeGuard] Erro ao decodificar token:', error);
      }
    } else {
      console.warn('[EmployeeGuard] REJEITADO - Sem token no storage');
    }
    
    this.router.navigate(['/login']);
    return false;
  }
}


