import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Login
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/login`, { email, password });
  }

  // Registro
  register(endpoint: string, body: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/${endpoint}`, body);
  }

  // Get Companies (hub)
  getCompanies(): Observable<any> {
    return this.http.get(`${this.apiUrl}/Companies`, { headers: this.getHeaders() });
  }

  // Get Employees (admin)
  getEmployees(): Observable<any> {
    return this.http.get(`${this.apiUrl}/Employees`, { headers: this.getHeaders() });
  }

  // Delete Employee
  deleteEmployee(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Employees/${id}`, { headers: this.getHeaders() });
  }

  // Get Services
  getServices(): Observable<any> {
    return this.http.get(`${this.apiUrl}/Services`, { headers: this.getHeaders() });
  }

  // Delete Service
  deleteService(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Services/${id}`, { headers: this.getHeaders() });
  }

  // Get Appointments
  getAppointments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/Appointments`, { headers: this.getHeaders() });
  }

  // Cancel Appointment
  cancelAppointment(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/Appointments/${id}/cancel`, {}, { headers: this.getHeaders() });
  }

  // Headers com JWT
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}