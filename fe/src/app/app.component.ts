/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { Component } from '@angular/core';
import * as appState from '@fe/app/state/app.state';
import { Store } from '@ngrx/store';
import { ObservedValueOf, Observable } from 'rxjs';
import { FrmdbStreamsService } from './state/frmdb-streams.service';

@Component({
  selector: 'body',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  host: {
    '[style.padding]': 'bodyPadding',
    '[class.frmdb-dev-mode-on]': 'devMode',
  }
})
export class AppComponent {
  title = 'frmdb';
  public devMode: boolean;
  bodyPadding = "0 0 60px 0";
  constructor(protected store: Store<appState.AppState>, public frmdbStreams: FrmdbStreamsService) {
    this.store.select(appState.getDeveloperMode).subscribe(devMode => {
      this.devMode = devMode;
      if (devMode) {
        this.bodyPadding = "49px 0 60px 0";
      } else {
        this.bodyPadding = "0 0 60px 0";
      }
    });

  }

  toggleDevMode() {
    this.store.dispatch(new appState.CoreToggleDeveloperModeAction());
  }
}
