import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Path ajustado (subindo 2 níveis pra services)

@Component({
  selector: 'app-account-activated',
  templateUrl: './account-activated.component.html',
  styleUrls: ['./account-activated.component.css']
})
export class AccountActivatedComponent implements OnInit {
  userType: string = 'conta'; // Default da rota
  successMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.userType = this.route.snapshot.paramMap.get('type') || 'conta';
    
    // Mensagem dinâmica por type (do PDF: resumo – hub, agendamentos, visibilidade)
    switch (this.userType) {
      case 'company':
        this.successMessage = 'Sua empresa foi ativada no hub VEA! Gerencie agendamentos automáticos, funcionários e serviços para otimizar atendimentos e atrair clientes com visibilidade intuitiva.';
        break;
      case 'client':
        this.successMessage = 'Sua conta de cliente foi ativada! Explore o hub VEA, encontre empresas cadastradas e agende serviços de forma prática, sem burocracias ou ligações.';
        break;
      case 'employee':
        this.successMessage = 'Sua conta de funcionário foi ativada! Acesse agendamentos no VEA, gerencie tarefas e contribua para a eficiência da empresa.';
        break;
      default:
        this.successMessage = 'Sua conta foi ativada com sucesso no VEA - Veja, Explore e Agende! Otimize processos empresariais e conecte-se ao hub de serviços.';
    }
  }

  goToLogin() {
    this.router.navigate(['/login'], { queryParams: { activated: true } }); // Query pra toast no login
  }
}