import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ======================= INTERFACES =======================
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
export interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  roleId: number;
  emailVerified: boolean;
  roleName?: string;
  cargo?: string;
  role?: { id: number; name: string; active: boolean };
  fullPhotoUrl?: string;
}
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
export interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  active: boolean;
  companyId?: number;
  employeeIds?: number[];
}
export interface Appointment {
  id: number;
  startDateTime: string;
  endDateTime?: string;
  status: string;
  companyId?: number;
  clientId?: number;
  servicesJson?: string;
  totalDurationMinutes?: number;
  totalPrice?: number;
  totalAmount?: number;
  price?: number;
  employee?: Employee;
  service?: {
    id: number;
    name: string;
    duration?: number;
    price?: number;
  };
  services?: Array<{
    id: number;
    name: string;
    duration?: number;
    price?: number;
  }>;
}
interface ServiceReport {
  name: string;
  count: number;
  totalPrice: number;
}
export interface AgendaEvent {
  start: string;
  end: string;
  type: 'appointment' | 'block';
  title?: string;
  clientName?: string;
}

export interface EmployeeAppointment {
  id: number;
  startDateTime: string;
  endDateTime: string;
  status: string;
  clientName: string;
  clientPhone?: string;
  services: Array<{
    id: number;
    name: string;
    duration?: number;
    price?: number;
  }>;
  totalDurationMinutes: number;
}

export interface EmployeeAppointmentsResponse {
  period: 'today' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalAppointments: number;
  appointments: EmployeeAppointment[];
}

// ======================= API SERVICE =======================
@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // MUDANÇA PRINCIPAL: adicionamos /api no final da URL base
  private apiUrl = environment.apiUrl.endsWith('/')
    ? environment.apiUrl + 'api'
    : environment.apiUrl + '/api';

  constructor(private http: HttpClient) { }

  // ==================== HELPER PRIVADO ====================
  private extractData<T>(obs: Observable<ApiResponse<T>>): Observable<T> {
    return obs.pipe(
      map(res => {
        if (res?.success && res.data !== undefined && res.data !== null) {
          return res.data;
        }
        return (Array.isArray(res?.data) ? [] : {}) as T;
      }),
      catchError(err => {
        console.error('API Error:', err);
        return of((Array.isArray(err?.error) ? [] : {}) as T);
      })
    );
  }

  // ==================== AUTH ====================
  register(endpoint: string, userData: any): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/${endpoint}`, userData)
      .pipe(catchError(this.handleError('Registro falhou')));
  }

  login(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(catchError(this.handleError('Login falhou')));
  }

  confirmAccount(type: string, id: number, token: string): Observable<ConfirmResponse> {
    const params = new HttpParams().set('token', token);
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

  // ==================== COMPANY ====================
  getCompanies(filterLocation?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (filterLocation) params = params.set('location', filterLocation);
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

  // ==================== ROLES ====================
  getRoles(companyId?: number): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
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

  // ==================== EMPLOYEES ====================
  getEmployees(companyId?: number): Observable<ApiResponse<Employee[]>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    return this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}/employees`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar funcionários')));
  }

  getEmployee(id: number): Observable<ApiResponse<Employee>> {
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/employees/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar funcionário')));
  }

  createEmployee(employee: FormData): Observable<ApiResponse<Employee>> {
    const headers = new HttpHeaders({ 'Authorization': this.getAuthHeaders().get('Authorization') || '' });
    return this.http.post<ApiResponse<Employee>>(`${this.apiUrl}/employees`, employee, { headers })
      .pipe(catchError(this.handleError('Falha ao criar funcionário')));
  }

  updateEmployee(id: number, employee: FormData): Observable<ApiResponse<Employee>> {
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
      .pipe(catchError(this.handleError('Falha ao enviar e-mail de verificação')));
  }

  getActivationData(id: number, token: string): Observable<ApiResponse<ActivationData>> {
    const params = new HttpParams().set('token', token);
    return this.http.get<ApiResponse<ActivationData>>(`${this.apiUrl}/employees/${id}/activation-data`, { params })
      .pipe(catchError(this.handleError('Falha ao buscar dados de ativação')));
  }

  activateEmployee(id: number, body: { token: string; password: string }): Observable<ApiResponse<Employee>> {
    return this.http.post<ApiResponse<Employee>>(`${this.apiUrl}/employees/${id}/activate`, body)
      .pipe(catchError(this.handleError('Falha ao ativar funcionário')));
  }

  // ==================== SERVICES ====================
  getServices(companyId?: number, includeInactive = false): Observable<ApiResponse<Service[]>> {
    if (!companyId) return throwError(() => new Error('CompanyId obrigatório'));
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', 'true');
    return this.http.get<ApiResponse<Service[]>>(`${this.apiUrl}/services/company/${companyId}`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar serviços')));
  }

  createService(service: Service): Observable<ApiResponse<Service>> {
    return this.http.post<ApiResponse<Service>>(`${this.apiUrl}/services`, service, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao criar serviço')));
  }

  updateService(id: number, service: Service): Observable<ApiResponse<Service>> {
    return this.http.put<ApiResponse<Service>>(`${this.apiUrl}/services/${id}`, service, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao atualizar serviço')));
  }

  deleteService(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/services/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao deletar serviço')));
  }

  toggleServiceActive(id: number, active: boolean): Observable<ApiResponse<Service>> {
    return this.http.patch<ApiResponse<Service>>(`${this.apiUrl}/services/${id}/active`, { active }, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao alternar status do serviço')));
  }

  // ==================== APPOINTMENTS ====================
  getAppointments(companyId?: number): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/appointments`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar agendamentos')));
  }

  getAppointmentsWeek(params: { start: string; end: string; companyId: number }): Observable<ApiResponse<Appointment[]>> {
    let httpParams = new HttpParams()
      .set('start', params.start)
      .set('end', params.end)
      .set('companyId', params.companyId.toString());
    return this.http.get<ApiResponse<Appointment[]>>(`${this.apiUrl}/appointments/week`, { params: httpParams, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar agenda semanal')));
  }

  getAppointmentsWeekPublic(params: { start: string; end: string; companyId: number }): Observable<ApiResponse<any[]>> {
    let httpParams = new HttpParams()
      .set('start', params.start)
      .set('end', params.end)
      .set('companyId', params.companyId.toString());
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/appointments/week`, { params: httpParams })
      .pipe(catchError(this.handleError('Falha ao buscar agenda semanal (público)')));
  }

  getMyAppointments(companyId?: number): Observable<ApiResponse<Appointment[]>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    return this.http.get<ApiResponse<Appointment[]>>(`${this.apiUrl}/appointments/my-appointments`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar meus agendamentos')));
  }

  cancelAppointment(id: number): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/appointments/${id}/cancel`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao cancelar agendamento')));
  }

  // ==================== EMPLOYEE (PRESTADOR) ====================
  getEmployeeProfile(): Observable<ApiResponse<Employee>> {
    const token = localStorage.getItem('token');
    console.log('[ApiService] getEmployeeProfile - Token presente?', !!token);
    console.log('[ApiService] getEmployeeProfile - URL:', `${this.apiUrl}/employees/me`);
    // Headers obrigatórios conforme doc da API: Authorization + Content-Type
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.http.get<ApiResponse<Employee>>(`${this.apiUrl}/employees/me`, { headers })
      .pipe(catchError(this.handleError('Falha ao buscar perfil do prestador')));
  }

  getEmployeeAppointmentsToday(): Observable<ApiResponse<EmployeeAppointmentsResponse>> {
    return this.http.get<ApiResponse<EmployeeAppointmentsResponse>>(`${this.apiUrl}/appointments/employee/today`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar agendamentos de hoje')));
  }

  getEmployeeAppointmentsWeek(date?: string): Observable<ApiResponse<EmployeeAppointmentsResponse>> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<ApiResponse<EmployeeAppointmentsResponse>>(`${this.apiUrl}/appointments/employee/week`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar agendamentos da semana')));
  }

  getEmployeeAppointmentsMonth(year: number, month: number): Observable<ApiResponse<EmployeeAppointmentsResponse>> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());
    return this.http.get<ApiResponse<EmployeeAppointmentsResponse>>(`${this.apiUrl}/appointments/employee/month`, { params, headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError('Falha ao buscar agendamentos do mês')));
  }

  // ==================== MÉTODOS PÚBLICOS DO MODAL ====================
  getServicesByCompany(companyId: number): Observable<Service[]> {
    return this.extractData(
      this.http.get<ApiResponse<Service[]>>(`${this.apiUrl}/appointments/services?companyId=${companyId}`)
    );
  }

  getEmployeesByService(companyId: number, serviceId: number = 0): Observable<Employee[]> {
    return this.extractData(
      this.http.get<ApiResponse<Employee[]>>(`${this.apiUrl}/appointments/employees?companyId=${companyId}&serviceId=${serviceId}`)
    );
  }

  getAvailableSlots(
    companyId: number,
    employeeId: number,
    dateStr: string,
    serviceIds: number[] | number
  ): Observable<string[]> {
    let params = new HttpParams()
      .set('companyId', companyId.toString())
      .set('employeeId', employeeId.toString())
      .set('dateStr', dateStr);
    if (Array.isArray(serviceIds)) {
      serviceIds.forEach(id => params = params.append('serviceIds', id.toString()));
    } else {
      params = params.set('durationMinutes', serviceIds.toString());
    }
    return this.extractData(
      this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/appointments/available-slots`, { params })
    );
  }

  getAgendaDoDia(companyId: number, employeeId: number, dateStr: string): Observable<AgendaEvent[]> {
    const params = new HttpParams()
      .set('companyId', companyId.toString())
      .set('employeeId', employeeId.toString())
      .set('date', dateStr);
    return this.extractData(
      this.http.get<ApiResponse<AgendaEvent[]>>(`${this.apiUrl}/appointments/agenda-day`, { params })
    );
  }

  createAppointment(payload: any): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.apiUrl}/appointments`, payload)
      .pipe(catchError(this.handleError('Falha ao criar agendamento')));
  }

  // ==================== UPLOAD ====================
  uploadImage(file: File, type: 'logo' | 'cover' | 'employee_photo'): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.apiUrl}/upload?type=${type}`;
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
      console.error(`[ApiService ${operation}] Full Error:`, error);
      let msg = 'Algo deu errado! Tente novamente.';
      if (error.error?.message) msg = error.error.message;
      else if (error.status === 401) msg = 'Sessão expirada. Faça login novamente.';
      else if (error.status === 403) msg = 'Acesso negado.';
      else if (error.status === 500) msg = 'Erro no servidor. Contate o suporte.';
      return throwError(() => ({ message: msg, status: error.status }));
    };
  }
}