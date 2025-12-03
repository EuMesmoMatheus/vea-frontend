import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class EmployeeGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded && decoded.role === 'Employee') {
          return true;
        }
      } catch (error) {
        console.error('EmployeeGuard - Erro ao decodificar token:', error);
      }
    }
    this.router.navigate(['/login']);
    return false;
  }
}


