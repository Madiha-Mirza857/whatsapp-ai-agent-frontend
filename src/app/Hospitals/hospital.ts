import { environment } from './../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hospital } from '../Interfaces/hospital.interface';


@Injectable({ providedIn: 'root' })
export class HospitalService {
  private readonly baseUrl = `${environment.apiUrl}/hospitals`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Hospital[]> {
    return this.http.get<Hospital[]>(this.baseUrl);
  }

  getById(id: string): Observable<Hospital> {
    return this.http.get<Hospital>(`${this.baseUrl}/${id}`);
  }

  register(payload: Partial<Hospital>): Observable<Hospital> {
    return this.http.post<Hospital>(`${this.baseUrl}/register`, payload);
  }

  update(id: string, payload: Partial<Hospital>): Observable<Hospital> {
    return this.http.patch<Hospital>(`${this.baseUrl}/${id}`, payload);
  }

  softDelete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}