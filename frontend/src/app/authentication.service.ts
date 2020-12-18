import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Login } from "./models";

@Injectable()
export class AuthenticationService {

    credentials;
    url='http://localhost:3000'

    constructor(private http: HttpClient){}

    loginAuthenticate(loginInfo: Login):Promise<any>{
        //console.log('svc', loginInfo)
        return this.http.post<Login>('/login', loginInfo).toPromise()
    }

}