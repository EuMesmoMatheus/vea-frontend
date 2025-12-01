import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  duration?: number; // ms, default 4000
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  toast$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error', duration = 4000): void {
    const toast: ToastMessage = { message, type, duration };
    this.toastSubject.next(toast);
    // Auto-hide com delay
    setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    this.toastSubject.next(null);
  } //bla
}