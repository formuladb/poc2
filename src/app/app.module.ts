import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';

import { StoreModule } from '@ngrx/store';
import {
  StoreRouterConnectingModule,
  RouterStateSerializer,
} from '@ngrx/router-store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { NavigationComponent } from './navigation/navigation.component';
import { FormComponent } from './form/form.component';
import { FormInputComponent } from './form/form_input/form_input.component';
import { FormAutocompleteComponent } from "./form/form_autocomplete/form_autocomplete.component";
import { FormTabsComponent } from "./form/form_tabs/form_tabs.component";
import { FormTableComponent } from "./form/form_table/form_table.component";
import { FormDatepickerComponent } from "./form/form_datepicker/form_datepicker.component";
import { FormTimepickerComponent } from "./form/form_timepicker/form_timepicker.component";
import { FormItemComponent } from "./form/form_item/form_item.component";
import { TableComponent } from './table/table.component';
import { EditorComponent } from './editor/editor.component';
import { ModalComponent } from './modal/modal.component';
import { TreeComponent } from './tree/tree.component';
import { environment } from '../environments/environment';

import * as appState from './app.state';

import { AppEffects } from "./app.effects";

import { FormModalService } from "./form-modal.service";
import { MwzParser } from "./mwz-parser";
import { BackendService } from "./backend.service";
import { HighlightService } from './services/hightlight.service';
import { MetaItemEditorComponent } from './tree/meta-item-editor/meta-item-editor.component';
import { DragService } from './services/drag.service';
import { EditOptionsService } from './services/edit.options.service';

const routes: Routes = [
  {
    path: ':module', component: TableComponent,
  },
  {
    path: ':module/:entity', component: TableComponent,
  },
  {
    path: ':module/:entity/:_id', component: FormComponent,
  },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    NavigationComponent,
    FormComponent,
    TreeComponent,
    FormInputComponent,
    FormAutocompleteComponent,
    FormTabsComponent,
    FormTableComponent,
    FormDatepickerComponent,
    FormTimepickerComponent,
    FormItemComponent,
    TableComponent,
    EditorComponent,
    ModalComponent,
    MetaItemEditorComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes),
    StoreModule.forRoot(appState.reducers, { metaReducers: [appState.appMetaReducer] }),
    NgbModule.forRoot(),
    StoreRouterConnectingModule,
    // !environment.production ? StoreDevtoolsModule.instrument() : [],
    EffectsModule.forRoot([AppEffects]),
    HttpClientModule
  ],
  exports: [RouterModule],
  providers: [
    FormModalService,
    MwzParser,
    BackendService,
    HighlightService,
    DragService,
    EditOptionsService,
    { provide: RouterStateSerializer, useClass: appState.CustomSerializer },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
