import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast-global',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="toast" 
         class="fixed top-4 right-4 z-50 transform transition-all duration-400 ease-in-out toast-container" 
         [ngClass]="{'translate-x-0 opacity-100 scale-100': !isFading, 'toast-fading opacity-0 scale-95 translate-x-full': isFading}">
      <div class="flex items-center justify-between px-6 py-4 max-w-sm text-white shadow-xl border toast-content"
           [ngClass]="{'bg-green-500 border-green-600': toast.type === 'success', 'bg-red-500 border-red-600': toast.type === 'error'}">
        <div class="flex items-center space-x-3 flex-1">
          <!-- Ícone sucesso -->
          <svg *ngIf="toast.type === 'success'" class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <!-- Ícone erro -->
          <svg *ngIf="toast.type === 'error'" class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span class="font-semibold">{{ toast.message }}</span>
        </div>
        <button (click)="hideToast()" class="text-white hover:text-gray-200 text-xl font-bold ml-2">&times;</button>
      </div>
    </div>
  `,
  styles: [`
    /* Animação de entrada: Slide-in com fade e scale */
    @keyframes slideInRight {
      from {
        transform: translateX(100%) scale(0.95);
        opacity: 0;
      }
      to {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }

    /* Animação de saída: Fade out + slide + scale pra "derreter" */
    @keyframes fadeOutRight {
      from {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
      to {
        transform: translateX(100%) scale(0.95);
        opacity: 0;
      }
    }

    .toast-container {
      animation: slideInRight 0.4s ease-out forwards;
    }

    .toast-fading {
      animation: fadeOutRight 0.4s ease-in forwards;
    }

    /* Bordas onduladas: Arredondado assimétrico pra efeito wavy/orgânico */
    .toast-content {
      border-radius: 25px 20px 25px 20px / 15px 30px 15px 30px;
      /* Pra mais "ondas", descomente: clip-path: polygon(0% 20%, 15% 0%, 85% 0%, 100% 20%, 100% 80%, 85% 100%, 15% 100%, 0% 80%); */
    }

    /* Spinner se precisar em outro lugar */
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastGlobalComponent implements OnDestroy {
  toast: ToastMessage | null = null;
  isFading = false;
  private subscription: Subscription;

  constructor(private toastService: ToastService, private cdr: ChangeDetectorRef) {
    this.subscription = this.toastService.toast$.subscribe(toast => {
      this.toast = toast;
      this.isFading = false;
      if (toast) {
        this.cdr.detectChanges();
      }
    });
  }

  hideToast(): void {
    this.isFading = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.isFading = false;
      this.toastService.hide(); // Limpa no service
      this.cdr.detectChanges();
    }, 400); // Duração da animação
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}