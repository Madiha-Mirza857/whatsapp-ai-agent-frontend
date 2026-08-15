import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { Appointment } from '../appointmentservice';

export interface CalendarCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-calendar-component.html',
  styleUrl: './appointment-calendar-component.css',
})
export class AppointmentCalendarComponent implements OnChanges {
  @Input() appointments: Appointment[] = [];
  @Input() isAdmin = false;
  @Input() isDoctor = false;

  @Output() cancel = new EventEmitter<string>();
  @Output() complete = new EventEmitter<string>();

  weekdayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  currentMonth: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  calendarCells: CalendarCell[] = [];
  selectedCell: CalendarCell | null = null;

  private appointmentsByDate = new Map<string, Appointment[]>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointments']) {
      this.groupAppointments();
      this.buildCalendar();
    }
  }

  // ---------- Month navigation ----------

  prevMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.buildCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.buildCalendar();
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.buildCalendar();
    const todayCell = this.calendarCells.find((c) => this.isSameDay(c.date, today));
    if (todayCell) {
      this.selectedCell = todayCell;
    }
  }

  get monthLabel(): string {
    return this.currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }

  // ---------- Grid building ----------

  private buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const startDay = firstOfMonth.getDay(); // 0 = Sun ... 6 = Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: CalendarCell[] = [];

    // Leading days from the previous month
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push(this.makeCell(new Date(year, month - 1, daysInPrevMonth - i), false));
    }

    // Days in the current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(this.makeCell(new Date(year, month, d), true));
    }

    // Trailing days to complete full weeks (6 rows x 7 cols = 42 cells)
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      cells.push(this.makeCell(next, false));
    }

    this.calendarCells = cells;

    // Keep selection if the same date still exists in the new grid, otherwise clear it
    if (this.selectedCell) {
      this.selectedCell =
        this.calendarCells.find((c) => this.isSameDay(c.date, this.selectedCell!.date)) || null;
    }
  }

  private makeCell(date: Date, isCurrentMonth: boolean): CalendarCell {
    return {
      date,
      isCurrentMonth,
      isToday: this.isSameDay(date, new Date()),
      appointments: this.appointmentsByDate.get(this.dateKey(date)) || [],
    };
  }

  private groupAppointments(): void {
    this.appointmentsByDate.clear();
    for (const appt of this.appointments) {
      const date = this.getAppointmentDate(appt);
      if (!date) {
        continue;
      }
      const key = this.dateKey(date);
      const list = this.appointmentsByDate.get(key) || [];
      list.push(appt);
      this.appointmentsByDate.set(key, list);
    }
  }

  private dateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  getAppointmentDate(appointment: Appointment): Date | null {
    const raw: any = appointment.slot?.startTime || appointment.createdAt;
    return raw ? new Date(raw) : null;
  }

  // ---------- Selection & side panel ----------

  selectDay(cell: CalendarCell): void {
    this.selectedCell = cell;
  }

  closePanel(): void {
    this.selectedCell = null;
  }

  get selectedDayLabel(): string {
    if (!this.selectedCell) return '';
    return this.selectedCell.date.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  get selectedDayWeekday(): string {
    if (!this.selectedCell) return '';
    return this.selectedCell.date.toLocaleDateString([], { weekday: 'long' });
  }

  // ---------- Display helpers ----------

  formatTime(date: any): string {
    return date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  }

  getDoctorName(appointment: Appointment): string {
    return appointment.doctor?.name || 'N/A';
  }

  getStatusBadge(status: string): string {
    const badges: { [key: string]: string } = {
      pending_payment: 'badge-pending',
      confirmed: 'badge-confirmed',
      completed: 'badge-completed',
      cancelled_expired: 'badge-cancelled',
    };
    return badges[status] || 'badge-pending';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      pending_payment: 'Pending Payment',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled_expired: 'Cancelled/Expired',
    };
    return labels[status] || status;
  }

  getStatusDotClass(status: string): string {
    const dots: { [key: string]: string } = {
      pending_payment: 'dot-pending',
      confirmed: 'dot-confirmed',
      completed: 'dot-completed',
      cancelled_expired: 'dot-cancelled',
    };
    return dots[status] || 'dot-pending';
  }

  canCancel(appointment: Appointment): boolean {
    return this.isAdmin || (this.isDoctor && appointment.status === 'pending_payment');
  }

  canComplete(appointment: Appointment): boolean {
    return (this.isAdmin || this.isDoctor) && appointment.status === 'confirmed';
  }

  onCancel(appointment: Appointment): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.cancel.emit(appointment.id);
    }
  }

  onComplete(appointment: Appointment): void {
    if (confirm('Mark this appointment as completed?')) {
      this.complete.emit(appointment.id);
    }
  }

  trackByCell(index: number, cell: CalendarCell): string {
    return this.dateKey(cell.date);
  }

  trackByAppointment(index: number, appointment: Appointment): string {
    return appointment.id;
  }
}