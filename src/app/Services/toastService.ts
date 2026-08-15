import { Injectable, signal } from '@angular/core';

export interface ToastMessage { message: string;
  type: 'success' | 'error'; }

@Injectable({ providedIn: 'root' })
export class ToastService { private toasts = signal<ToastMessage[]>([]);
  readonly currentToasts = this.toasts.asReadonly();

 show(message: string | string[], type: 'success' | 'error' = 'error') {
  const messageText = Array.isArray(message) ? message.join('\n') : message;
  const toast: ToastMessage = { message: messageText, type };
  this.toasts.update(current => [...current, toast]);
  
  setTimeout(() => { this.removeToast(toast); }, 3000);
}

  private removeToast(toast: ToastMessage) { this.toasts.update(current => current.filter(t => t !== toast)); }

  clear() { this.toasts.set([]); } }