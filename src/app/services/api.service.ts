import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
// Interfaces for typing
interface RegisterResponse {
  success: boolean;
  user: any;
  message: string;
  token?: string;
}
interface ConfirmResponse {
  success: boolean;
  message: string;
  type?: string;
}
interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
}
// Interface para CompanyDto (alinhada com o backend)
interface CompanyDto {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  operatingHours?: string;
  businessType?: string;
  isActive: boolean;
  logo?: string;
  coverImage?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}
// Interfaces atualizadas para Employee (alinhadas com EmployeeDto do backend)
export interface Employee {  // <<< FIX: Adicionado 'export' pra permitir import
  id: number;
  name: string;
  email: string;
  phone?: string;
  roleId: number;
  emailVerified: boolean;
  roleName?: string;  // Novo: Nome do cargo direto do DTO
  cargo?: string;  // <<< FIX: Adicionado pra compatibilidade com HTML original (se backend retornar 'cargo')
  role?: { id: number; name: string; active: boolean };
  fullPhotoUrl?: string;  // Novo: URL completa da foto (do DTO backend)
}
// NOVO: Interface pra dados de ativação (do backend)
interface ActivationData {
  id: number;
  name: string;
  email: string;
}
interface Role {
  id: number;
  name: string;
  active: boolean;
}
// CENTRALIZADO: Service unificado e exportado (companyId opcional pra flexibilidade)
export interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  companyId?: number;  // Opcional: Backend pode não mandar no GET; map seta no front
  employeeIds?: number[];  // Opcional: Pro DTO (IDs de employees atribuídos)
}
// <<< UPDATE: Alinhado com backend Appointment (string dates, optional end, etc.)
export interface Appointment {
  id: number;
  startDateTime: string;
  endDateTime?: string;
  status: string;
  companyId?: number;
  service?: Service;
  employee?: Employee;
  clientId?: number;
}
interface ServiceReport {
  name: string;
  count: number;
  totalPrice: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl; // ex.: 'http://localhost:5001/api'
  constructor(private http: HttpClient) { }
  // ==================== AUTHENTICATION METHODS ====================
  register(endpoint: string, userData: any): Observable<RegisterResponse> {
    const safeData = { ...userData, password: userData.password ? '***' : undefined };
    console.log('Enviando registro para:', `${this.apiUrl}/${endpoint}`, safeData);
    const headers = new HttpHeaders();
    return this.http.post<RegisterResponse>(`${this.apiUrl}/${endpoint}`, userData, { headers })
      .pipe(catchError(this.handleError('Registro falhou')));
  }
  login(email: string, password: string): Observable<RegisterResponse> {
    const safePayload = { email, password: '***' };
    console.log('Enviando login para:', `${this.apiUrl}/auth/login`, safePayload);
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(catchError(this.handleError('Login falhou')));
  }
  confirmAccount(type: string, id: number, token: string): Observable<ConfirmResponse> {
    const params = new HttpParams().set('token', token);
    console.log('Confirmando conta:', `${this.apiUrl}/auth/confirm/${type}/${id}?token=***`);
    return this.http.get<ConfirmResponse>(`${this.apiUrl}/auth/confirm/${type}/${id}`, { params })
      .pipe(catchError(this.handleError('Falha ao confirmar conta')));
  }
  checkEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/auth/check-email/${encodeURIComponent(email)}`)
      .pipe(catchError(this.handleError('Falha ao verificar e-mail')));
  }
  resendVerification(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/resend-verification`, { email })
      .pipe(catchError(this.handleError('Falha ao reenviar e-mail')));
  }
  // ==================== COMPANY MANAGEMENT METHODS ====================
  getCompanies(filterLocation?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (filterLocation) {
      params = params.set('location', filterLocation);
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/companies`, { params })
      .pipe(catchError(this.handleError('Falha ao buscar empresas')));
  }
  getCompany(id: number): Observable<ApiResponse<CompanyDto>> {
    return this.http.get<ApiResponse<CompanyDto>>(`${this.apiUrl}/companies/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar empresa')));
  }
  createCompany(company: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/companies`, company, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao criar empresa')));
  }
  updateCompany(id: number, company: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/companies/${id}`, company, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao atualizar empresa')));
  }
  deleteCompany(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/companies/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao deletar empresa')));
  }
  // ==================== ROLE MANAGEMENT METHODS ====================
  getRoles(companyId?: number): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/roles`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar cargos')));
  }
  createRole(role: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/roles`, role, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao criar cargo')));
  }
  updateRole(id: number, role: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/roles/${id}`, role, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao atualizar cargo')));
  }
  deleteRole(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/roles/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao deletar cargo')));
  }
  toggleRoleActive(id: number, active: boolean): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/roles/${id}/active`, { active }, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao alternar status do cargo')));
  }
  // ==================== EMPLOYEE MANAGEMENT METHODS ====================
  getEmployees(companyId?: number): Observable<ApiResponse<Employee[]>> {  // Atualizado: Typing pra Employee[]
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    return this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}/employees`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar funcionários')));
  }
  getEmployee(id: number): Observable<ApiResponse<Employee>> {  // Atualizado: Typing pra Employee
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/employees/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar funcionário')));
  }
  createEmployee(employee: FormData): Observable<ApiResponse<Employee>> {  // Atualizado: Aceita FormData e retorna Employee
    // Para FormData, usa só Authorization header (sem Content-Type, deixa o HttpClient gerenciar)
    const headers = new HttpHeaders({ 'Authorization': this.getAuthHeaders().get('Authorization') || '' });
    return this.http.post<ApiResponse<Employee>>(`${this.apiUrl}/employees`, employee, { headers })
      .pipe(catchError(this.handleError('Falha ao criar funcionário')));
  }
  updateEmployee(id: number, employee: FormData): Observable<ApiResponse<Employee>> {  // Atualizado: Aceita FormData e retorna Employee
    // Para FormData, usa só Authorization header
    const headers = new HttpHeaders({ 'Authorization': this.getAuthHeaders().get('Authorization') || '' });
    return this.http.put<ApiResponse<Employee>>(`${this.apiUrl}/employees/${id}`, employee, { headers })
      .pipe(catchError(this.handleError('Falha ao atualizar funcionário')));
  }
  deleteEmployee(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/employees/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao deletar funcionário')));
  }
  sendVerificationEmail(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/employees/${id}/verify-email`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao enviar verificação de e-mail')));
  }
  // NOVOS MÉTODOS PARA ATIVAÇÃO DE FUNCIONÁRIO (anônimos, sem auth)
  getActivationData(id: number, token: string): Observable<ApiResponse<ActivationData>> {
    const params = new HttpParams().set('token', token);
    console.log('Buscando dados de ativação para:', `${this.apiUrl}/employees/${id}/activation-data?token=***`);
    // Sem headers de auth, pois é anônimo
    return this.http.get<ApiResponse<ActivationData>>(`${this.apiUrl}/employees/${id}/activation-data`, { params })
      .pipe(catchError(this.handleError('Falha ao buscar dados de ativação')));
  }
  activateEmployee(id: number, body: { token: string; password: string }): Observable<ApiResponse<Employee>> {
    const safeBody = { ...body, password: '***' };
    console.log('Ativando funcionário:', `${this.apiUrl}/employees/${id}/activate`, safeBody);
    // Sem headers de auth, pois é anônimo
    return this.http.post<ApiResponse<Employee>>(`${this.apiUrl}/employees/${id}/activate`, body)
      .pipe(catchError(this.handleError('Falha ao ativar conta')));
  }
  // ==================== SERVICE MANAGEMENT METHODS ====================
  // <<< FIX: Alinhado pro route param do backend (/services/company/{id}?includeInactive=true)
  // + Log da URL full + Fallback pro companyId do token se não passado
  getServices(companyId?: number, includeInactive: boolean = false): Observable<ApiResponse<Service[]>> {
    // Fallback: Pega companyId do token se não passado (decode simples via localStorage)
    if (!companyId) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
          companyId = payload.companyId ? +payload.companyId : undefined;
        } catch (e) {
          console.warn('[ApiService] Erro ao decodar token pra companyId:', e);
        }
      }
    }
    if (!companyId) {
      return throwError(() => new Error('CompanyId obrigatório para carregar serviços'));
    }
    const url = `${this.apiUrl}/services/company/${companyId}`;
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    const fullUrl = `${url}${params.toString() ? '?' + params.toString() : ''}`;
    console.log('[ApiService getServices] Chamando URL:', fullUrl, 'com token:', this.getAuthHeaders().get('Authorization')?.substring(0, 20) + '...');
    return this.http.get<ApiResponse<Service[]>>(url, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar serviços')));
  }
  // Otimizado: Typing Service
  createService(service: Service): Observable<ApiResponse<Service>> {
    return this.http.post<ApiResponse<Service>>(`${this.apiUrl}/services`, service, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao criar serviço')));
  }
  // Otimizado: Typing Service
  updateService(id: number, service: Service): Observable<ApiResponse<Service>> {
    return this.http.put<ApiResponse<Service>>(`${this.apiUrl}/services/${id}`, service, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao atualizar serviço')));
  }
  // Otimizado: Typing genérico
  deleteService(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/services/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao deletar serviço')));
  }
  // Otimizado: Novo método com typing
  toggleServiceActive(id: number, active: boolean): Observable<ApiResponse<Service>> {
    return this.http.patch<ApiResponse<Service>>(`${this.apiUrl}/services/${id}/active`, { active }, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao alternar status do serviço')));
  }
  // ==================== APPOINTMENT MANAGEMENT METHODS ====================
  getAppointments(companyId?: number): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/appointments`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar agendamentos')));
  }
  // <<< UPDATE: Tipagem melhorada para Appointment[]
  getAppointmentsWeek(params: { start: string; end: string; companyId: number }): Observable<ApiResponse<Appointment[]>> {
    console.log('[getAppointmentsWeek] Params:', params, 'Token exists?', !!localStorage.getItem('token'));  // <<< MODIFICAÇÃO: Log extra pra debug token
    let httpParams = new HttpParams()
      .set('start', params.start)
      .set('end', params.end)
      .set('companyId', params.companyId.toString());
    return this.http.get<ApiResponse<Appointment[]>>(`${this.apiUrl}/appointments/week`, { params: httpParams, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar agenda semanal')));
  }
  // <<< NOVO MÉTODO: Versão pública sem auth (pra guests ou clients sem role Admin/Employee)
  getAppointmentsWeekPublic(params: { start: string; end: string; companyId: number }): Observable<ApiResponse<any[]>> {
    console.log('[getAppointmentsWeekPublic] Params (sem auth):', params);  // <<< Debug
    let httpParams = new HttpParams()
      .set('start', params.start)
      .set('end', params.end)
      .set('companyId', params.companyId.toString());
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/appointments/week`, { params: httpParams })  // <<< Sem headers de auth!
      .pipe(catchError(this.handleError('Falha ao buscar agenda semanal (público)')));
  }
  // <<< NOVO MÉTODO: Para o cliente ver seus agendamentos (usa auth, role Client)
  getMyAppointments(companyId?: number): Observable<ApiResponse<Appointment[]>> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }
    console.log('[getMyAppointments] Chamando com companyId:', companyId);
    return this.http.get<ApiResponse<Appointment[]>>(`${this.apiUrl}/appointments/my-appointments`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar meus agendamentos')));
  }
  cancelAppointment(id: number): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/appointments/${id}/cancel`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao cancelar agendamento')));
  }
  // NOVOS MÉTODOS PARA O MODAL DE AGENDAMENTO (req 5.1-5.4)
  getServicesByCompany(companyId: number): Observable<ApiResponse<Service[]>> {
    return this.http.get<ApiResponse<Service[]>>(`${this.apiUrl}/appointments/services?companyId=${companyId}`)
      .pipe(catchError(this.handleError('Falha ao buscar serviços da empresa')));
  }
  getEmployeesByService(companyId: number, serviceId: number): Observable<ApiResponse<Employee[]>> {
    return this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}/appointments/employees?companyId=${companyId}&serviceId=${serviceId}`)
      .pipe(catchError(this.handleError('Falha ao buscar funcionários por serviço')));
  }
  // <<< FIX: Parâmetros corrigidos pra dateStr e durationMinutes (alinhado com backend/Swagger)
  getAvailableSlots(companyId: number, employeeId: number, dateStr: string, duration: number): Observable<ApiResponse<string[]>> {
    const fullUrl = `${this.apiUrl}/appointments/available-slots?companyId=${companyId}&employeeId=${employeeId}&dateStr=${dateStr}&durationMinutes=${duration}`;
    console.log('[ApiService getAvailableSlots] Chamando:', fullUrl);
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/appointments/available-slots?companyId=${companyId}&employeeId=${employeeId}&dateStr=${dateStr}&durationMinutes=${duration}`)
      .pipe(catchError(this.handleError('Falha ao buscar horários disponíveis')));
  }
  createAppointment(payload: any): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.apiUrl}/appointments`, payload)
      .pipe(catchError(this.handleError('Falha ao criar agendamento')));
  }
  // ==================== UPLOAD METHODS ====================
  uploadImage(file: File, type: 'logo' | 'cover' | 'employee_photo'): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.apiUrl}/upload?type=${type}`;
    console.log('Enviando upload para:', url);
    return this.http.post<{ url: string }>(url, formData, { headers: this.getAuthHeaders() })
      .pipe(
        map(response => ({ success: true, data: response.url })),
        catchError(this.handleError('Falha ao fazer upload da imagem'))
      );
  }
  // ==================== UTILITY METHODS ====================
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
  }
  private handleError(operation = 'operation'): (error: any) => Observable<never> {
    return (error: any): Observable<never> => {
      // <<< FIX: Log full error pra debug (inclui url, status, body)
      console.error(`[ApiService ${operation}] Full Error:`, {
        status: error.status,
        url: error.url,
        message: error.message,
        error: error.error,
        headers: error.headers
      });
      let msg = 'Something went wrong! Please try again.';
      if (error.error?.message) {
        msg = error.error.message;  // <<< FIX: Usa msg específica do backend (ex: pra 400)
      } else if (error.status === 401) {
        msg = 'Session expired. Please log in again.';
        localStorage.removeItem('token');
      } else if (error.status === 403) {
        msg = 'Acesso negado. Verifique permissões.';  // <-- Toast pra 403
      } else if (error.status === 405) {  // <<< NOVO: Tratamento específico pro 405
        msg = 'Método não permitido. Verifique a rota ou método da requisição.';
      } else if (error.status === 500) {
        msg = 'Server error. Contact support.';
      }
      return throwError(() => ({ message: msg, status: error.status, url: error.url }));  // <<< FIX: Inclui url no throw
    };
  }
}