import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { Login } from '../models'
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  form: FormGroup
  errorMessage = ''

  constructor(private fb: FormBuilder, private auth: AuthenticationService, private http: HttpClient, private router: Router) { }

	ngOnInit(): void {
    this.form = this.fb.group({
      user_id: this.fb.control('', Validators.required),
			password: this.fb.control('', Validators.required)
    })
   }
  
  onLogin(){
    console.log('formdata', this.form)
     this.auth.loginAuthenticate(this.form.value as Login)
      .then(results => {
        console.log('login', results)
        this.router.navigate(['main'])
      })
      .catch(e => {
        console.log('error', e.error.log)
        this.errorMessage=e.error.log
      })

  }

}
