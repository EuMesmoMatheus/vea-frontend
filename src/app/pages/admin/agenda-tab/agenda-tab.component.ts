import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService, Appointment } from '..//../../services/api.service';
import { ConfirmService } from '../../../services/confirm.service';
import { ToastService } from '../../../services/toast.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LocalAppointment extends Appointment {
  dateTime: Date; // Extensão local para Date (mapeado do backend)
}

@Component({
  selector: 'app-agenda-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agenda-tab.component.html',
  styleUrls: ['./agenda-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgendaTabComponent implements OnInit, OnChanges {
  @Input() companyId!: number; // Obrigatório: ID da empresa
  @Output() apptCancelled = new EventEmitter<void>();

  selectedView: 'week' | 'day' | 'month' = 'week'; // Adicionado 'month'
  hours: string[] = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  weekDays: { label: string; date: string; isToday: boolean; appointmentsCount: number }[] = [];
  dayAppointments: LocalAppointment[] = [];
  monthAppointments: LocalAppointment[] = []; // Novo: Para visão mensal
  weekTitle = '';
  monthTitle = ''; // Novo
  todayDate = '';
  selectedDate = new Date();
  allAppointments: LocalAppointment[] = []; // Unificado: Todos os appts carregados para o range
  loading = false; // Indicador de load

  constructor(
    private api: ApiService, 
    private cdr: ChangeDetectorRef,
    private confirmService: ConfirmService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.companyId) {
      this.onViewChange(); // Carrega inicial baseado na view default
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['companyId'] && this.companyId) {
      this.onViewChange(); // Recarrega se companyId mudar
    }
  }

  onViewChange(): void {
    this.loading = true;
    let start: string, end: string;

    if (this.selectedView === 'week') {
      const startOfWeek = new Date(this.selectedDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      start = startOfWeek.toISOString().split('T')[0];
      end = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      this.buildWeekView();
    } else if (this.selectedView === 'day') {
      start = this.selectedDate.toISOString().split('T')[0];
      end = start;
      this.selectedDate = new Date(start); // Garante data limpa
      this.updateDayView();
    } else if (this.selectedView === 'month') {
      const year = this.selectedDate.getFullYear();
      const month = this.selectedDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
      this.buildMonthView();
    }

    // Carrega dados para o range
    this.loadAppointments(start!, end!);
  }

  private loadAppointments(start: string, end: string): void {
    this.api.getAppointmentsWeek({ start, end, companyId: this.companyId }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allAppointments = res.data.map((a: Appointment) => ({
            ...a,
            dateTime: new Date(a.startDateTime),
          })) as LocalAppointment[];
          this.updateViews();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar agendamentos:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updateViews(): void {
    if (this.selectedView === 'week') {
      // Removido: this.appointments = this.allAppointments; (não necessário, pois getter e funções usam allAppointments)
      this.buildWeekView();
    } else if (this.selectedView === 'day') {
      this.dayAppointments = this.allAppointments.filter(appt => 
        appt.dateTime.toDateString() === this.selectedDate.toDateString()
      );
    } else if (this.selectedView === 'month') {
      this.monthAppointments = [...this.allAppointments].sort((a, b) => 
        a.dateTime.getTime() - b.dateTime.getTime()
      );
    }
  }

  private buildWeekView(): void {
    const startOfWeek = new Date(this.selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    this.weekDays = [];
    this.weekTitle = `${startOfWeek.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
    this.todayDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = dayDate.toISOString().split('T')[0];
      const isToday = dayDate.toDateString() === new Date().toDateString();
      const count = this.allAppointments.filter(appt => appt.dateTime.toISOString().split('T')[0] === dateStr).length;
      this.weekDays.push({ label: dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }), date: dateStr, isToday, appointmentsCount: count });
    }
  }

  private buildMonthView(): void {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    this.monthTitle = new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  private updateDayView(): void {
    if (this.selectedView === 'day') {
      this.dayAppointments = this.allAppointments.filter(appt => appt.dateTime.toDateString() === this.selectedDate.toDateString());
    }
  }

  // Navegação
  prevWeek(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 7);
    this.onViewChange();
  }
  nextWeek(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 7);
    this.onViewChange();
  }
  prevMonth(): void { // Novo
    this.selectedDate.setMonth(this.selectedDate.getMonth() - 1);
    this.onViewChange();
  }
  nextMonth(): void { // Novo
    this.selectedDate.setMonth(this.selectedDate.getMonth() + 1);
    this.onViewChange();
  }
  prevDay(): void { // Novo: Para consistência
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.onViewChange();
  }
  nextDay(): void { // Novo
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.onViewChange();
  }

  getAppointmentsForDayHour(dateStr: string, hourStr: string): LocalAppointment[] {
    const hour = parseInt(hourStr.split(':')[0], 10);
    return this.allAppointments.filter(appt => {
      const apptDateStr = appt.dateTime.toISOString().split('T')[0];
      const apptHour = appt.dateTime.getHours();
      return apptDateStr === dateStr && apptHour === hour;
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Confirmed': return '✅';
      case 'Scheduled': return '⏳'; // Novo: Para agendamentos novos
      case 'Cancelled': return '❌';
      default: return '⏳';
    }
  }

  getStatusClass(status: string): { [key: string]: boolean } {
    switch (status) {
      case 'Confirmed':
      case 'Scheduled': return { 'bg-green-100 text-green-800': true };
      case 'Cancelled': return { 'bg-red-100 text-red-800': true };
      default: return { 'bg-gray-100 text-gray-800': true };
    }
  }

  async cancelAppointment(id: number): Promise<void> {
    const confirmed = await this.confirmService.danger(
      'Deseja cancelar este agendamento?',
      'Cancelar Agendamento'
    );
    
    if (confirmed) {
      this.api.cancelAppointment(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.onViewChange();
            this.apptCancelled.emit();
            this.toast.success('Agendamento cancelado! ✅');
          }
        },
        error: () => this.toast.error('Erro ao cancelar agendamento. ❌')
      });
    }
  }

  exportCalendar(): void {
    const element = document.getElementById('calendar-section');
    if (element) {
      html2canvas(element).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const fileName = `agenda_${this.selectedView}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
      });
    }
  }

  // Removido: Getter 'appointments' (não mais necessário, pois HTML usa funções que acessam allAppointments diretamente)
}