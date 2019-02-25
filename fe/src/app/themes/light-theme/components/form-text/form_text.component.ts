/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import {
    Component, OnInit, OnDestroy
} from '@angular/core';
import * as _ from "lodash";

import { FormTextComponent as BaseFormTextComponent } from "@fe/app/form/form-text/form_text.component";

import { Store } from '@ngrx/store';
import * as fromForm from '../../../../form/form.state';
@Component({
    selector: 'form-text',
    host: { class: "col form-group" },
    templateUrl: '../../../../form/form-text/form_text.component.html',
    styleUrls: ['../../../../form/form-text/form_text.component.scss']
})
export class FormTextComponent extends BaseFormTextComponent implements OnInit, OnDestroy {
    constructor(protected formStore: Store<fromForm.FormState>) {
        super(formStore);
    }
}
