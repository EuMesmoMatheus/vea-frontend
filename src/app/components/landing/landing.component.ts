// src/app/components/landing/landing.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  mobileMenuOpen = false;

  constructor(private router: Router) {}

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  navigateToHub(): void {
    this.closeMobileMenu();
    this.router.navigate(['/hub']);
  }

  navigateToLogin(): void {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeMobileMenu();
    this.router.navigate(['/register']);
  }

  scrollToSection(section: string): void {
    this.closeMobileMenu();
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
  }
}