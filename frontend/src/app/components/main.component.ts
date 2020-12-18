import { Component, OnInit } from '@angular/core';
import {CameraService} from '../camera.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { AuthenticationService } from '../authentication.service';
import { ShareService } from '../share.service';
import { Login } from '../models'
import { Router } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

	imagePath = '/assets/cactus.png'
	form: FormGroup
	imageBlob: ''
	errorMessage = ''

	constructor(private cameraSvc: CameraService, private auth: AuthenticationService, private shareSvc: ShareService, private fb: FormBuilder, private http: HttpClient, private router: Router) { }

	ngOnInit(): void {
		this.form = this.fb.group({
			title: this.fb.control('', Validators.required),
			comments: this.fb.control('', Validators.required),
			image: this.fb.control(''),
		  });
	  
		  if (this.cameraSvc.hasImage()) {
			const img = this.cameraSvc.getImage();
			this.imagePath = img.imageAsDataUrl;
			this.form.get('image').patchValue(this.cameraSvc.getImage());
		  }
	}
	  

	clear() {
		this.imagePath = '/assets/cactus.png'
		this.form.patchValue({
			title: '',
			comments: '',
			image: '',
		  });
	}

	share(){
		console.log('data', this.form, 'image', this.imagePath)
		console.log('credentials', this.auth.credentials.user_id)
		const shareData = new FormData();
		shareData.set('title', this.form.get('title').value);
		shareData.set('comments', this.form.get('comments').value);
		shareData.set('user_id', this.auth.credentials.user_id)
		shareData.set('password', this.auth.credentials.password)
		shareData.set('upload', this.cameraSvc.getImage().imageData)

		this.shareSvc.shareInformation(shareData)
			.then(results => {
				console.log(results)
				this.clear();
				this.form.reset();
			})
			.catch(e => {
				console.log('error', e.status)
				if(e.status == '401')
				{
					this.router.navigate(['/'])
				}
			});
	}
}
