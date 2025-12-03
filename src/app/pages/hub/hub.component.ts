import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { timeout, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TrackByFunction } from '@angular/core';
import { AgendamentoModalComponent } from '../agendamento-modal/agendamento-modal.component';
import { environment } from '../../../environments/environment';

/**
 * Componente de Hub para exibição de empresas cadastradas.
 * Carrega e filtra empresas, permite agendamento.
 */
interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
}

interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

interface Cidade {
  id: number;  // Código IBGE
  nome: string;
}

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, AgendamentoModalComponent],  // <- Adicione aqui
  templateUrl: './hub.component.html',
  styleUrls: ['./hub.component.css']
})
export class HubComponent implements OnInit {
  companies: any[] = [];
  filteredCompanies: any[] = [];
  // Filtros principais
  searchName = '';
  selectedTipo: string = '';
  userCep = localStorage.getItem('userCep') || '';
  maxDistance = 10;
  onlyOpen = false;
  selectedCidade: Cidade | null = null;
  // Sub-filtros
  states: Estado[] = [];
  cities: Cidade[] = [];
  searchBairro = '';
  searchRua = '';
  selectedEstadoSigla = '';
  // Toggle para filtros colapsíveis
  showFilters = false;
  // Loading para filtros
  filtering = false;
  error = '';
  loading = false;
  loadingLocation = false;
  user: any = {};
  private searchSubject = new Subject<string>();
  private apiBaseUrl = environment.apiUrl;
  private ibgeApiUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';
  // Modal props (sem Angular Material, usando flag)
  showModal = false;
  selectedCompanyId: number | null = null;

  constructor(
    private api: ApiService,
    private http: HttpClient,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {  // <<< FIX: Async pra aguardar loadUser
    this.showFilters = false; // Default: filtros fechados
    await this.loadUser();  // <<< FIX: Await pra garantir user pronto antes do check

    // <<< FIX: Check mais robusto – se name vazio/falsy, redirect com log
    if (!this.user.name || this.user.name.trim() === '') {
      console.error('Usuário sem nome válido após load. LocalStorage "user":', localStorage.getItem('user'));  // <<< Debug full
      console.warn('Usuário não logado ou dados inválidos, redirecionando pra login...');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/hub' } });  // <<< FIX: Adiciona returnUrl pra voltar após login
      return;
    }

    console.log('User validado e carregado:', this.user);  // <<< Debug: Confirma name/email/role
    this.loadCompanies();
    this.loadLocationData();

    // Debounce para inputs de texto (nome, CEP, bairro/rua) pra evitar spam no typing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((timestamp) => {
      console.log('Debounce fired:', timestamp); // Debug log
      this.applyFiltersWithLoading();
    });

    // <<< FIX: Double-check pós-load (pra timing issues)
    setTimeout(() => {
      if (!this.user.name || this.user.name.trim() === '') {
        console.error('Double-check falhou: User ainda inválido, forçando reload.');
        window.location.reload();  // <<< Força reload da página se persistir
      }
    }, 500);  // 500ms pra dar tempo pro localStorage "assentar"
  }

  // Toggle para abrir/fechar filtros
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  private async loadLocationData(): Promise<void> {  // <<< FIX: Async pra consistência
    this.loadingLocation = true;
    try {
      const data = await this.http.get<Estado[]>(`${this.ibgeApiUrl}/estados`).pipe(timeout(10000)).toPromise();
      this.states = data || [];
    } catch (err) {
      console.error('Erro carregando estados:', err);
      // Fallback com estados exemplo
      this.states = [
        { id: 35, sigla: 'SP', nome: 'São Paulo' },
        { id: 41, sigla: 'PR', nome: 'Paraná' }
      ];
    } finally {
      this.loadingLocation = false;
    }
  }

  onStateChange(sigla: string): void {
    this.selectedEstadoSigla = sigla;
    if (!sigla) {
      this.cities = [];
      this.selectedCidade = null;
      this.applyFiltersWithLoading(); // Atualiza simultaneamente ao limpar
      return;
    }
    this.loadingLocation = true;
    this.http.get<Cidade[]>(`${this.ibgeApiUrl}/estados/${sigla.toUpperCase()}/municipios`).subscribe({
      next: (data) => {
        this.cities = data || [];
        this.loadingLocation = false;
        this.applyFiltersWithLoading(); // Atualiza simultaneamente após carregar cidades
      },
      error: (err) => {
        console.error('Erro carregando cidades:', err);
        this.loadingLocation = false;
        this.cities = [];
        this.applyFiltersWithLoading(); // Atualiza mesmo em erro
      }
    });
  }

  onUserCepChange(): void {
    localStorage.setItem('userCep', this.userCep);
  }

  private async loadUser(): Promise<void> {  // <<< FIX: Async + melhor validação
    const userData = localStorage.getItem('user');
    console.log('LocalStorage "user" raw:', userData);  // <<< Debug: Vê o JSON cru

    if (userData) {
      try {
        this.user = JSON.parse(userData);
        console.log('User parseado:', this.user);

        // <<< FIX: Validação strict – se role Client e name/email presentes, OK; senão, limpa e redirect
        if (this.user.role !== 'Client' || !this.user.name || !this.user.email || this.user.name.trim() === '' || this.user.email.trim() === '') {
          console.error('User dados inválidos (role, name ou email faltando):', this.user);
          localStorage.removeItem('user');  // <<< Limpa inválido
          localStorage.removeItem('token');  // <<< Limpa token também
          throw new Error('Dados de user incompletos ou inválidos');  // Triggera fallback/redirect
        }

        // Se chegou aqui, user tá válido – sem fallback pra convidado
        return;
      } catch (parseErr) {
        console.error('Erro parseando user JSON:', parseErr);
        localStorage.removeItem('user');  // <<< Limpa corrompido
      }
    }

    // Fallback/Erro: Sem user válido
    console.error('Nenhum user válido em localStorage. Forçando login.');
    this.user = { name: '', email: '' };  // <<< Define como empty pra triggerar redirect no ngOnInit
    throw new Error('Usuário não encontrado no localStorage');  // Não usa fallback "Convidado" – força login
  }

  logout(): void {
    console.log('Logout: Limpando localStorage...');
    localStorage.clear();  // <<< FIX: Limpa TUDO (token, user, cep) pra evitar resquícios
    this.router.navigate(['/login']);
  }

  loadCompanies(): void {
    this.loading = true;
    this.error = '';
    this.api.getCompanies('').pipe(timeout(10000)).subscribe({
      next: (response: ApiResponse<any[]>) => {
        if (response.success !== false) {
          const data = response.data || [];
          this.companies = data;
          this.filteredCompanies = [...this.companies];
          console.log('Empresas carregadas:', this.companies.length, 'itens');
          // <<< FIX: Log tabela com Ids pra debug (confirma Id=1 pra Barber Lofy)
          console.table(this.companies.map(c => ({ id: c.id, name: c.name, operatingHours: c.operatingHours })));
        } else {
          console.warn('getCompanies falhou:', response.message);
          this.companies = [];
          this.filteredCompanies = [];
        }
      },
      error: (err) => {
        console.error('Erro completo no loadCompanies:', err);
        this.error = err.error?.message || 'Erro ao carregar empresas. Tente novamente.';
        this.loading = false;
        this.filteredCompanies = [];
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  isOpenNow(company: any): boolean {
    if (!company?.operatingHours || typeof company.operatingHours !== 'string') return false; // Fix: check undefined
    const parts = company.operatingHours.split('-');
    if (parts.length !== 2) return false;
    const [open, close] = parts;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTotalMin = currentHour * 60 + currentMin;
    const openTotalMin = this.timeToMinutes(open);
    const closeTotalMin = this.timeToMinutes(close);
    return currentTotalMin >= openTotalMin && currentTotalMin <= closeTotalMin;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  getCepDistance(cep1: string, cep2: string): number {
    const num1 = cep1.replace(/\D/g, '');
    const num2 = cep2.replace(/\D/g, '');
    if (num1.length < 5 || num2.length < 5) return Infinity;
    const diff = Math.abs(parseInt(num1) - parseInt(num2));
    return Math.min(diff / 1000, 50);
  }

  // Método principal de filtro com loading
  applyFiltersWithLoading(): void {
    if (this.filtering) return; // Evita chamadas duplicadas
    this.filtering = true;
    console.log('Iniciando filtro...'); // Debug
    // Simula um delay mínimo pra mostrar o loading (UX)
    setTimeout(() => {
      this.applyAllFilters();
      this.filtering = false;
      console.log('Filtro concluído. Resultados:', this.filteredCompanies.length); // Debug
    }, 100); // 100ms mínimo pra loading flashar
  }

  applyAllFilters(): void {
    let tempFiltered = [...this.companies];
   
    // Filtro por nome
    if (this.searchName.trim()) {
      tempFiltered = tempFiltered.filter(c =>
        (c.name || '').toLowerCase().includes(this.searchName.toLowerCase())
      );
    }
   
    if (this.selectedTipo) {
      tempFiltered = tempFiltered.filter(c => c.businessType === this.selectedTipo);
    }
   
    if (this.userCep.trim()) {
      const userNum = this.userCep.replace(/\D/g, '');
      if (userNum.length >= 5) {
        tempFiltered = tempFiltered.filter(c => {
          const companyCep = (c.cep || '').replace(/\D/g, '');
          const dist = this.getCepDistance(this.userCep, companyCep);
          return dist <= this.maxDistance;
        });
      }
    }
   
    if (this.onlyOpen) {
      tempFiltered = tempFiltered.filter(c => this.isOpenNow(c));
    }
   
    if (this.selectedCidade) {
      const cidadeNome = this.selectedCidade?.nome?.toLowerCase() || '';
      tempFiltered = tempFiltered.filter(c => (c.cidade || '').toLowerCase() === cidadeNome);
    }
    if (this.searchBairro.trim()) {
      tempFiltered = tempFiltered.filter(c => (c.bairro || '').toLowerCase().includes(this.searchBairro.toLowerCase()));
    }
    if (this.searchRua.trim()) {
      tempFiltered = tempFiltered.filter(c => (c.logradouro || '').toLowerCase().includes(this.searchRua.toLowerCase()));
    }
   
    this.filteredCompanies = tempFiltered;
  }

  clearFilters(): void {
    this.searchName = '';
    this.selectedTipo = '';
    this.userCep = localStorage.getItem('userCep') || '';
    this.maxDistance = 10;
    this.onlyOpen = false;
    this.selectedCidade = null;
    this.searchBairro = '';
    this.searchRua = '';
    this.selectedEstadoSigla = '';
    this.cities = [];
    this.showFilters = false; // Fecha os filtros após limpar
    this.applyFiltersWithLoading();
  }

  applyFilters(): void {
    this.applyFiltersWithLoading();
  }

  onFilterChange(): void {
    const timestamp = Date.now().toString(); // Força distinct com timestamp único
    this.searchSubject.next(timestamp); // Para inputs com debounce
  }

  // Método para mudanças simultâneas em selects/checkbox (chama direto, com loading)
  onImmediateFilterChange(): void {
    this.applyFiltersWithLoading();
  }

  // ATUALIZADO: Abre modal de agendamento (sem Material, usa flag)
  // <<< FIX: MUDE pra receber company full (do *ngFor), não só Id
  schedule(company: any): void {  // <<< FIX: Recebe company objeto
    const companyId = company.id;  // <<< FIX: Extrai Id do objeto
    console.log('[Hub] Schedule chamado pra company:', company.name, 'ID:', companyId);  // <<< FIX: Log pra debug (deve ser 1)
    if (!companyId) {
      console.warn('ID da empresa inválido');
      return;
    }
    this.selectedCompanyId = companyId;
    this.showModal = true; // Abre modal
  }

  // Método pra fechar modal (chamado do modal)
  closeModal(event: { success: boolean }): void {
    this.showModal = false;
    this.selectedCompanyId = null;
    if (event.success) {
      this.loadCompanies(); // Refresh hub
    }
  }

  onImageError(event: any): void {
    console.warn('Erro carregando imagem:', event.target.src);
    event.target.src = 'https://via.placeholder.com/80x80/FF69B4/FFFFFF?text=?';
  }

  getCompanyDescription(name: string, businessType?: string): string {
    const types: Record<string, string> = {
      'Barbearia': 'cortes modernos e cuidados com barba de alta qualidade.',
      'Estética': 'tratamentos faciais e corporais personalizados.',
    };
    const desc = types[businessType || ''] || 'serviços profissionais e confiáveis.';
    return `${name || 'Empresa'} oferece ${desc}`;
  }

  trackByCompanyId(index: number, company: any): number {
    return company.id;
  }

  getFullImageUrl(imagePath: string): string {
    if (!imagePath || imagePath.trim() === '') return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    return `${this.apiBaseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  }

  get tipoOptions(): string[] {
    return [...new Set(this.companies.map(c => c.businessType).filter(Boolean))];
  }
}