import { TestBed, async } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA }          from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { StoreModule, Store, combineReducers } from '@ngrx/store';
import * as appState from "./app.state";
import { AppComponent } from './app.component';
import { NavigationComponent } from './navigation/navigation.component';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        StoreModule.forRoot(appState.reducers),
        FormsModule,
        NgbModule.forRoot(),
      ],
      declarations: [
        AppComponent,
        NavigationComponent
      ],
      providers: [],
      schemas:      [ NO_ERRORS_SCHEMA ]
    }).compileComponents();
  }));
  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
  it(`should have as title 'app'`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('app');
  }));
  it('should render bla bla bla', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('.navbar-brand').textContent).toContain('Metawiz');
  }));
});
