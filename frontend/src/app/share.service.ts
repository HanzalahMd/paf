import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable()
export class ShareService{

    constructor(private http: HttpClient){}

    shareInformation(sharedata: FormData):Promise<any>{
        return this.http.post('/share', sharedata).toPromise();
    }

}