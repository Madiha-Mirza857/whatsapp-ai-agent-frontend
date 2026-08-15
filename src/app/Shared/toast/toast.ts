import { Component } from '@angular/core';
import { ToastService } from '../../Services/toastService';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (toast of toastService.currentToasts(); track $index) {
        <div class="toast-notification" [class]="toast.type">
          <div class="toast-icon">
            @if (toast.type === 'success') {
              <i class="fa-solid fa-check-circle"></i>
            } @else {
              <i class="fa-solid fa-exclamation-circle"></i>
            }
          </div>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.clear()">x</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container { position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px; }

    .toast-notification { min-width: 280px;
      max-width: 400px;
      padding: 14px 18px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #ffffff;
      border: 1px solid rgba(74, 144, 226, 0.18);
      box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
      animation: slideIn 0.3s ease-out; }

    @keyframes slideIn { from { transform: translateX(100%);
        opacity: 0; }
      to { transform: translateX(0);
        opacity: 1; } }

    .toast-notification.success {
      border-left: 4px solid #4caf50; }

    .toast-notification.error {
      border-left: 4px solid #dc3545; }

    .toast-icon { font-size: 20px; color: #1976d2; }
    
    .toast-notification.success .toast-icon { color: #4caf50; }
    .toast-notification.error .toast-icon { color: #dc3545; }

    .toast-message { flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: #2c3e50; }

    .toast-close { background: none;
      border: none;
      color: #90a4ae;
      font-size: 20px;
      cursor: pointer;
      opacity: 0.7;
      padding: 0 4px; }

    .toast-close:hover { opacity: 1; color: #1976d2; }

    @media (max-width: 576px) { .toast-container { left: 16px;
        right: 16px;
        top: 16px; }

      .toast-notification { max-width: none;
        width: 100%; } }
  `]
})
export class Toast {
  constructor(public toastService: ToastService) {}
}
