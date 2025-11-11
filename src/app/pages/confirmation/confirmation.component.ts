import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Path pro teu AuthService (ajuste se preciso)

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.css']
})
export class ConfirmationComponent implements OnInit {
  loading = true;
  success = false;
  error = '';
  message = '';
  private type: string = '';
  private id: number = 0;
  private token: string = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.type = this.route.snapshot.paramMap.get('type') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    // FIX: Safe null check pra id (evita TS2531)
    const idStr = this.route.snapshot.paramMap.get('id');
    this.id = idStr ? +idStr : 0;

    // Validação rápida no front (token obrigatório)
    if (!this.token || !this.type || this.id === 0) {
      this.error = 'Link inválido. Verifique o email e tente novamente.';
      this.loading = false;
      return;
    }

    // Chama o service pra confirmar (GET no back-end)
    this.confirmAccount();
  }

  private confirmAccount() {
    this.loading = true;
    this.error = '';
    this.success = false;

    this.authService.confirmAccount(this.type, this.id, this.token).subscribe({
      next: (res) => {
        if (res.success) {
          this.success = true;
          this.message = res.message || 'Conta ativada com sucesso!';
          // REDIRECIONAMENTO: Delay pra UX, depois vai pra tela de sucesso (se tiver)
          setTimeout(() => {
            this.router.navigate(['/account-activated', res.type || 'conta']);
          }, 1500); // 1.5s pra mostrar success breve
        } else {
          this.error = res.message || 'Falha na ativação. Tente reenviar o email.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro na confirmação:', err); // Log pro dev
        this.error = err.message || 'Erro na ativação. Verifique o link e tente novamente.';
        this.loading = false;
      }
    });
  }

  // Método pra retry (rechama API)
  retryConfirmation() {
    if (this.token && this.type && this.id > 0) {
      this.confirmAccount();
    } else {
      this.error = 'Link inválido para retry. Verifique o email.';
    }
  }

  // Método pra ir pro login
  goToLogin() {
    this.router.navigate(['/login'], { queryParams: { activated: true } }); // Query pra toast no login
  }
}