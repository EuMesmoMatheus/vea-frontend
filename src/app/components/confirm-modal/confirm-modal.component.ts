import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConfirmService, ConfirmOptions } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="options" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="cancel()"></div>
      
      <!-- Modal -->
      <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 opacity-100"
           [class.animate-shake]="shake">
        <!-- Header com ícone -->
        <div class="p-6 text-center">
          <!-- Ícone danger -->
          <div *ngIf="options.type === 'danger'" 
               class="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </div>
          
          <!-- Ícone warning -->
          <div *ngIf="options.type === 'warning'" 
               class="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          
          <!-- Ícone info -->
          <div *ngIf="options.type === 'info'" 
               class="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          
          <h3 class="text-xl font-bold text-gray-900 mb-2">{{ options.title }}</h3>
          <p class="text-gray-600">{{ options.message }}</p>
        </div>
        
        <!-- Botões -->
        <div class="flex gap-3 p-6 pt-0">
          <button (click)="cancel()" 
                  class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
            {{ options.cancelText }}
          </button>
          <button (click)="confirm()" 
                  class="flex-1 px-4 py-3 font-semibold rounded-xl transition-colors text-white"
                  [ngClass]="{
                    'bg-red-600 hover:bg-red-700': options.type === 'danger',
                    'bg-amber-500 hover:bg-amber-600': options.type === 'warning',
                    'bg-blue-600 hover:bg-blue-700': options.type === 'info'
                  }">
            {{ options.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .animate-shake {
      animation: shake 0.5s ease-in-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModalComponent implements OnDestroy {
  options: ConfirmOptions | null = null;
  shake = false;
  private subscription: Subscription;

  constructor(private confirmService: ConfirmService, private cdr: ChangeDetectorRef) {
    this.subscription = this.confirmService.confirm$.subscribe(options => {
      this.options = options;
      this.shake = false;
      this.cdr.detectChanges();
    });
  }

  confirm(): void {
    this.confirmService.respond(true);
  }

  cancel(): void {
    this.shake = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.confirmService.respond(false);
    }, 150);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}

