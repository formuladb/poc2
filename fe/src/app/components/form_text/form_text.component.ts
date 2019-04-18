/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { NodeType, FormText } from "@core/domain/uimetadata/form";
import {
    Component, OnInit, OnDestroy
} from '@angular/core';
import { CircularJSON } from "@core/json-stringify";

import { BaseNodeComponent } from "../base_node";
import { AbstractControl } from '@angular/forms';
import * as _ from "lodash";

import { FormEditingService } from "../form-editing.service";

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'frmdb-form_text',
    host: { class: 'col form-group' },
    templateUrl: './form_text.component.html',
    styleUrls: ['./form_text.component.scss']
})
export class FormTextComponent extends BaseNodeComponent implements OnInit, OnDestroy {
    ctrl: AbstractControl | null;

    inputElement: FormText;

    constructor(formEditingService: FormEditingService) {
        super(formEditingService);
    }

    ngOnInit(): void {
        this.inputElement = this.nodel as FormText;
        this.ctrl = this.formgrp.get(this.fullpath);
        console.log(this.fullpath, this.nodel, this.ctrl);
    }
    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe())
    }
    get representation(): string {
        if (this.nodel.nodeType != NodeType.form_text) throw new Error("form-text node element is wrong: " + CircularJSON.stringify(this.nodel));
        return this.nodel.representation || "string";
    }

    get value(): string {
        if (this.ctrl) {
            if (this.inputElement.representation === '_id') {
                return this.ctrl.value.replace(/^.*~~/, '')
            } 
            else return this.ctrl.value;
        }
        return "No content available";
    }

    getErrors(): string[] {
        if (this.ctrl == null) return [];
        return _.keys(this.ctrl.errors || {});
    }
}