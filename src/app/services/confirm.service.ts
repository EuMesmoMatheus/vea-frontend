import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private confirmSubject = new BehaviorSubject<ConfirmOptions | null>(null);
  private resolveRef: ((value: boolean) => void) | null = null;

  confirm$ = this.confirmSubject.asObservable();

  /**
   * Abre modal de confirmação e retorna Promise<boolean>
   * @param options - Opções do modal
   * @returns Promise que resolve true (confirmar) ou false (cancelar)
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveRef = resolve;
      this.confirmSubject.next({
        title: options.title || 'Confirmação',
        message: options.message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        type: options.type || 'warning'
      });
    });
  }

  // Métodos de conveniência
  danger(message: string, title = 'Atenção'): Promise<boolean> {
    return this.confirm({ title, message, type: 'danger', confirmText: 'Excluir' });
  }

  warning(message: string, title = 'Confirmação'): Promise<boolean> {
    return this.confirm({ title, message, type: 'warning' });
  }

  /**
   * Chamado pelo componente do modal quando usuário responde
   */
  respond(confirmed: boolean): void {
    if (this.resolveRef) {
      this.resolveRef(confirmed);
      this.resolveRef = null;
    }
    this.confirmSubject.next(null);
  }
}

