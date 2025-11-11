import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode'; // FIX: Named import (v3+)

import { environment } from '../../environments/environment';
import { ApiService } from './api.service'; // Importa ApiService pra delegar chamadas

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: { id: number; name: string; email: string; role: 'Admin' | 'Employee' | 'Client' };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Usa teu environment
  private tokenKey = 'vea_token';
  private roleKey = 'vea_role';
  private userIdKey = 'vea_userId';
  private userRole$ = new BehaviorSubject<string | null>(this.getRole());

  constructor(private http: HttpClient, private router: Router, private apiService: ApiService) {}

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  setAuthData(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.roleKey, response.user.role);
    localStorage.setItem(this.userIdKey, response.user.id.toString());
    this.userRole$.next(response.user.role);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  getUserId(): number | null {
    const idStr = localStorage.getItem(this.userIdKey);
    return idStr ? parseInt(idStr, 10) : null;
  }

  getUserRole$(): Observable<string | null> {
    return this.userRole$.asObservable();
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    return !!token && !this.isTokenExpired(token);
  }

  // FIX: Adicionei checagem de role não-null pra mais robustez
  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.userIdKey);
    this.userRole$.next(null);
    this.router.navigate(['/login']);
  }

  getHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem(this.tokenKey);
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // NOVO: Método pra confirmação (delega pro ApiService, mas centraliza na auth)
  confirmAccount(type: string, id: number, token: string): Observable<any> {
    return this.apiService.confirmAccount(type, id, token).pipe(
      map((response) => {
        if (response.success) {
          console.log('Confirmação bem-sucedida:', response.message);
          // Opcional: Redireciona pra login após delay, ou deixa o component lidar
          setTimeout(() => this.router.navigate(['/login']), 2000);
        }
        return response;
      })
    );
  }
}