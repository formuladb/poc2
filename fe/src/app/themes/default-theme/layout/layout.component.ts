/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { lightBootstrapDashbord } from './light-bootstrap-dashboard';
import { Inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { Store } from '@ngrx/store';

import * as fromEntity from '../../../entity-state';
import { Observable } from 'rxjs';

@Component({
  selector: 'frmdb-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, AfterViewInit {
  selectedEntity$: Observable<fromEntity.Entity>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, protected store: Store<fromEntity.EntityState>) {
    this.selectedEntity$ = this.store.select(fromEntity.getSelectedEntityState)
  }

  ngOnInit() {
  }

  
  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      lightBootstrapDashbord()
    }
  }
}