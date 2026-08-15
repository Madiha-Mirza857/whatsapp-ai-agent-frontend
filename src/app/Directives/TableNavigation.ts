import { Directive, ElementRef, HostListener, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appTableNavigation]',
  standalone: true,
})
export class TableNavigationDirective implements OnInit {
  @Input() updateFn!: (row: HTMLElement) => void;
  @Input() deleteFn!: (row: HTMLElement) => void;
  @Input() detailsFn!: (row: HTMLElement) => void;

  private currentIndex = -1;
  private rows: HTMLElement[] = [];

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    // Initial row collection
    this.updateRows();
  }

  private updateRows(): void {
    const container: HTMLElement = this.el.nativeElement;
    this.rows = Array.from(container.querySelectorAll('tbody tr'));
    
    // Reset current index if out of bounds
    if (this.currentIndex >= this.rows.length) {
      this.currentIndex = this.rows.length - 1;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Skip if event is from input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Update rows in case the list changed
    this.updateRows();

    if (!this.rows.length) return;

    // Arrow keys for navigation
    if (event.key === 'ArrowDown') {
      this.currentIndex = Math.min(this.currentIndex + 1, this.rows.length - 1);
      this.scrollRowIntoView(this.rows[this.currentIndex]);
      event.preventDefault();
      return;
    } else if (event.key === 'ArrowUp') {
      this.currentIndex = Math.max(this.currentIndex - 1, 0);
      this.scrollRowIntoView(this.rows[this.currentIndex]);
      event.preventDefault();
      return;
    }

    // If no row is selected, select the first one
    if (this.currentIndex === -1) {
      this.currentIndex = 0;
      this.scrollRowIntoView(this.rows[this.currentIndex]);
      return;
    }

    // Enter key for update
    if (event.key === 'Enter') {
      if (this.updateFn) {
        this.updateFn(this.rows[this.currentIndex]);
        event.preventDefault();
      }
      return;
    }

    // Ctrl + D for delete
    if (event.ctrlKey && event.key.toLowerCase() === 'd') {
      if (this.deleteFn) {
        this.deleteFn(this.rows[this.currentIndex]);
        event.preventDefault();
      }
      return;
    }

    // Ctrl + V for details
    if (event.ctrlKey && event.key.toLowerCase() === 'v') {
      if (this.detailsFn) {
        this.detailsFn(this.rows[this.currentIndex]);
        event.preventDefault();
      }
      return;
    }
  }

  private scrollRowIntoView(row: HTMLElement): void {
    const container: HTMLElement = this.el.nativeElement;
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;

    if (rowTop < containerTop) {
      container.scrollTop = rowTop;
    } else if (rowBottom > containerBottom) {
      container.scrollTop = rowBottom - container.clientHeight;
    }

    // Highlight active row
    container.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
    row.classList.add('active-row');
  }
}