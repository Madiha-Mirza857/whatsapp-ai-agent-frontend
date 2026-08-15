import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from "./Shared/navbar/navbar";
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('WhatsApp AI Agent');
  showNav = true;
  isNavCollapsed = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        const isLoginPage = this.router.url.startsWith('/login');
        this.showNav = !isLoginPage;
        console.log('🔄 App: showNav changed to:', this.showNav);
      });
  }

  onNavToggle(collapsed: boolean) {
    this.isNavCollapsed = collapsed;
  }
}