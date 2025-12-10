import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

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

  // MUDANÇA PRINCIPAL: agora usa o mesmo padrão do ApiService (com /api automático)
  private apiUrl = environment.apiUrl.endsWith('/')
    ? environment.apiUrl + 'api'
    : environment.apiUrl + '/api';

  private tokenKey = 'vea_token';
  private roleKey = 'vea_role';
  private userIdKey = 'vea_userId';
  private userRole$ = new BehaviorSubject<string | null>(this.getRole());

  constructor(
    private http: HttpClient,
    private router: Router,
    private apiService: ApiService
  ) {}

  // AGORA USA A URL CORRETA → /api/auth/login
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials);
  }

  // Alternativa ainda mais limpa (recomendada se quiser deixar 100% centralizado):
  // login(credentials: LoginCredentials): Observable<AuthResponse> {
  //   return this.apiService.login(credentials.email, credentials.password);
  // }

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
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token || ''}` }) };
  }

  // Continua usando o ApiService (já corrigido)
  confirmAccount(type: string, id: number, token: string): Observable<any> {
    return this.apiService.confirmAccount(type, id, token).pipe(
      map((response) => {
        if (response.success) {
          console.log('Confirmação bem-sucedida:', response.message);
          setTimeout(() => this.router.navigate(['/login']), 2000);
        }
        return response;
      })
    );
  }
}