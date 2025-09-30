import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatTabsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  submitted = false;
  error = '';
  type: 'client' | 'company' = 'client';

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', Validators.required],
      location: ['']
    });
  }

  onTypeChange(index: number) {
    this.type = index === 0 ? 'client' : 'company';
    if (this.type === 'company') {
      this.registerForm.controls['location'].setValidators([Validators.required]);
    } else {
      this.registerForm.controls['location'].clearValidators();
    }
    this.registerForm.controls['location'].updateValueAndValidity();
  }

  onSubmit() {
    this.submitted = true;
    if (this.registerForm.invalid) return;

    this.api.register(this.type === 'client' ? 'Auth/register/client' : 'Auth/register/company', this.registerForm.value).subscribe(
      () => {
        console.log('Notificação simulada: Cadastro bem-sucedido!');
        this.router.navigate(['/login']);
      },
      error => this.error = 'Erro ao cadastrar (e-mail já existe ou erro no servidor)'
    );
  }
}