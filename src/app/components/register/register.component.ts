import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule, NavModule, FormModule, ButtonModule } from '@coreui/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, NavModule, FormModule, ButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

  onTypeChange(type: 'client' | 'company') {
    this.type = type;
    if (this.type === 'company') {
      this.registerForm.controls.location.setValidators([Validators.required]);
    } else {
      this.registerForm.controls.location.clearValidators();
    }
    this.registerForm.controls.location.updateValueAndValidity();
  }

  onSubmit() {
    this.submitted = true;
    if (this.registerForm.invalid) return;

    this.api.register(this.type === 'client' ? 'Auth/register/client' : 'Auth/register/company', this.registerForm.value).subscribe(
      () => this.router.navigate(['/login']),
      error => this.error = 'Erro ao cadastrar'
    );
  }
}