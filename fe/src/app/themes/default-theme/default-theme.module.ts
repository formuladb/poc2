/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import { DefaultThemeRoutingModule } from './default-theme-routing.module';
import { LayoutComponent } from './layout/layout.component';
import { NavigationComponent } from './navigation/navigation.component';
import { NavigationSegment } from './navigation/navigation.segment';
import { ThemeEditorComponent } from './theme-editor/theme-editor.component';
import { TopNavComponent } from './top-nav/top-nav.component';
import { CrosscuttingModule } from '../../crosscutting/crosscutting.module';
import { FormulaEditorModule } from 'src/app/formula-editor/formula-editor.module';

@NgModule({
  imports: [
    CommonModule,
    NgbModule,
    DefaultThemeRoutingModule,
    CrosscuttingModule,
    FormulaEditorModule, //TODO: lazy load components from this module, e.g. https://plnkr.co/edit/ZGC82G9u10EQFYFvvRMB?p=preview
  ],
  declarations: [
    LayoutComponent,
    NavigationComponent,
    NavigationSegment,
    ThemeEditorComponent,
    TopNavComponent,
  ]
})
export class DefaultThemeModule { }
