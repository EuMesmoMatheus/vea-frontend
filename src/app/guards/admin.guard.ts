import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode'; // Correção para exportação nomeada

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    console.log('AdminGuard INICIADO - Verificando acesso...'); // NOVO: Log entrada
    const token = localStorage.getItem('token');
    console.log('AdminGuard - Token encontrado?', !!token); // NOVO: Confirma token
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        console.log('AdminGuard - Token decodificado:', decoded); // NOVO: Dump full decoded (veja claims)
        console.log('AdminGuard - Role no token?', decoded?.role); // NOVO: Role específica
        if (decoded && decoded.role === 'Admin') {
          console.log('AdminGuard APROVADO - Role OK, liberando acesso'); // NOVO: Sucesso
          return true;
        } else {
          console.error('AdminGuard REJEITADO - Role não é "Admin" (é:', decoded?.role, ')'); // NOVO: Erro detalhado
        }
      } catch (error) {
        console.error('AdminGuard - Erro ao decodificar token:', error); // NOVO: Catch detalhado
      }
    } else {
      console.error('AdminGuard REJEITADO - Sem token no storage'); // NOVO: Sem token
    }
    console.log('AdminGuard - Redirecionando pra /login'); // NOVO: Pré-redirect
    this.router.navigate(['/login']);
    return false;
  }
}