/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import {
  Component, OnInit, OnDestroy
} from '@angular/core';
import * as _ from "lodash";

import { FormDatepickerComponent as FormDatepickerComponentBase } from '@fe/app/form/form_datepicker/form_datepicker.component';

@Component({
  selector: 'form-datepicker',
  templateUrl: '../../../../form/form_datepicker/form_datepicker.component.html',
  styleUrls: ['../../../../form/form_datepicker/form_datepicker.component.scss']
})
export class FormDatepickerComponent extends FormDatepickerComponentBase implements OnInit, OnDestroy {
}
