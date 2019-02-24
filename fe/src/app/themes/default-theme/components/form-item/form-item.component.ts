/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import {
    Component, OnInit, OnDestroy
} from '@angular/core';
import * as _ from "lodash";

import { FormItemComponent as FormItemComponentBase } from '@kv_selector_base/app/form/form_item/form_item.component';

@Component({
    selector: 'form_item',
    templateUrl: '../../../../form/form_item/form_item.component.html',
    styleUrls: ['../../../../form/form_item/form_item.component.scss']
})
export class FormItemComponent extends FormItemComponentBase implements OnInit, OnDestroy {
    
}