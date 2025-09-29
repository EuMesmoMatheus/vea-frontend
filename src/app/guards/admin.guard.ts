import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode'; // Correção para exportação nomeada

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded && decoded.role === 'Admin') {
          return true;
        }
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
      }
    }
    this.router.navigate(['/login']);
    return false;
  }
}