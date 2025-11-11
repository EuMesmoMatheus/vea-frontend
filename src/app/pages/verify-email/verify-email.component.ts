import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // FIX: Pra *ngIf
import { ApiService } from '../../services/api.service'; // Ajusta o path se precisar
import { Location } from '@angular/common';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterModule, CommonModule], // FIX: CommonModule pra *ngIf
  templateUrl: './verify-email.component.html', // FIX: Aponta pro HTML certo
  styleUrls: ['./verify-email.component.css']
})
export class VerifyEmailComponent implements OnInit {
  message: string = 'Verifique seu e-mail para ativar a conta!';
  loading = false; // Prop pra loading
  resendMessage = ''; // Prop pra mensagem de resend

  constructor(
    private router: Router,
    private api: ApiService, // Pra chamar o resend
    private location: Location
  ) {}

  ngOnInit(): void {
    // Pega mensagem do state da rota (do register)
    this.message = history.state.message || this.message;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Função de reenviar email
  resendEmail(): void {
    this.loading = true;
    this.resendMessage = '';

    // Pega o email do localStorage (salvo no register)
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.resendMessage = 'Erro: Usuário não encontrado. Faça o cadastro novamente.';
      this.loading = false;
      return;
    }

    const user = JSON.parse(userStr);
    const email = user.email || user.Email; // Ajusta se o campo for Email (PascalCase do backend)
    if (!email) {
      this.resendMessage = 'Erro: E-mail não encontrado.';
      this.loading = false;
      return;
    }

    // Chama API pra resend
    this.api.resendVerification(email).subscribe({
      next: (response) => {
        this.loading = false;
        this.resendMessage = response.message || 'E-mail reenviado! Verifique sua caixa de entrada.';
      },
      error: (err) => {
        this.loading = false;
        this.resendMessage = err.error?.message || 'Erro ao reenviar. Tente novamente.';
        console.error('Erro resend:', err);
      }
    });
  }
}