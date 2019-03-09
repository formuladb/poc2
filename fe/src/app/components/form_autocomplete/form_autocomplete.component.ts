/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import {
    OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef
} from '@angular/core';

import { BaseNodeComponent } from '../base_node';

import { FormAutocomplete } from "@core/domain/uimetadata/form";
import { FormEditingService } from '../form-editing.service';
import { UserEnteredAutocompleteText, UserChoseAutocompleteOption } from '@fe/app/actions/form.user.actions';
import { I18nPipe } from '@fe/app/crosscutting/i18n/i18n.pipe';
import * as _ from 'lodash';
import { ValidatorFn, AbstractControl } from '@angular/forms';
import { Observable, Subject, ReplaySubject, BehaviorSubject } from 'rxjs';
import { debounceTime, map, tap, combineLatest, zip, distinctUntilChanged, filter } from 'rxjs/operators';
import { AutoCompleteState } from '@fe/app/state/app.state';
import { elvis, elvis_a } from '@core/elvis';

export class FormAutocompleteComponent extends BaseNodeComponent implements OnInit, OnDestroy {

    inputElement: FormAutocomplete;
    public text$: Subject<string> = new BehaviorSubject('');
    // public formatedStrOptions: string[] = [];
    private control: AbstractControl | null;
    private parentObjId: string | undefined;
    public autoCompleteState: AutoCompleteState | null;
    public currentSearchTxt: string | null;
    public popupOpened: boolean = false;

    constructor(formEditingService: FormEditingService, private i18npipe: I18nPipe, private changeDetectorRef: ChangeDetectorRef) {
        super(formEditingService);
    }

    getControl() {
        let ctrl = this.topLevelFormGroup.get(this.parentFormPath);
        if (!this.control) {
            if (ctrl) {
                let validators: ValidatorFn[] = [];
                if (ctrl.validator) validators.push(ctrl.validator);
                validators.push((control: AbstractControl): { [key: string]: any } | null => {
                    let validSelection = false;
                    for (let opt of elvis_a(elvis(this.autoCompleteState).options)) {
                        if (opt[this.inputElement.refPropertyName] === control.value) {
                            validSelection = true;
                        }
                    }
                    return validSelection ? null : { "option-not-found": "referenced value must exist" };
                });
                ctrl.setValidators(validators);
                this.parentObjId = elvis(this.formEditingService.getParentObj(ctrl))._id;
            }
            this.control = ctrl;
        }
        return this.control;
    }

    get relatedControls() {
        let ret = Object.values(elvis(elvis(this.autoCompleteState).controls) || {});
        return ret;
    }

    ngOnInit(): void {
        this.inputElement = this.nodeElement as FormAutocomplete;
        this.getControl();

        this.subscriptions.push(this.frmdbStreams.autoCompleteState$.subscribe(async (autoCompleteState) => {
            if (!this.isAutocompleteStateMatching(autoCompleteState)) return;
            this.autoCompleteState = autoCompleteState;

            if (autoCompleteState.selectedOption) {
                let ctrl = this.getControl();
                if (!ctrl) console.warn("Control not found for autocomplete ", this.topLevelFormGroup, this.parentFormPath);
                else {
                    ctrl.reset(autoCompleteState.selectedOption[this.inputElement.refPropertyName]);
                }
            }
            this.popupOpened = this.currentSearchTxt != null
                && (autoCompleteState.currentControl.propertyName === this.inputElement.propertyName);
            console.debug(this.parentObjId, (this.control as any).name, autoCompleteState, this.popupOpened, this.currentSearchTxt);
            this.changeDetectorRef.detectChanges();
        }));

        this.subscriptions.push(this.text$.pipe(
            distinctUntilChanged(),
            debounceTime(200),
        ).subscribe(val => {
            if (val.length >= 2 && this.control) {
                this.currentSearchTxt = val;
                let parentObj = this.formEditingService.getParentObj(this.control);
                if (parentObj && parentObj._id) {
                    this.frmdbStreams.action(new UserEnteredAutocompleteText(parentObj._id, val, this.inputElement));
                }
            }
        }));
    }

    highlightOption(option: {}) {
        return option[this.inputElement.refPropertyName].replace(this.currentSearchTxt + '', '<strong>' + this.currentSearchTxt + '</strong>');
    }

    isAutocompleteStateMatching(autoCompleteState: AutoCompleteState): boolean {
        if (!this.control) return false;
        if (!this.parentObjId || this.parentObjId !== autoCompleteState.currentObjId
            || (this.inputElement.refEntityAlias || this.inputElement.refEntityName) !== autoCompleteState.entityAlias) return false;
        return true;
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    getOptionValue(row): string {
        if (!this.autoCompleteState) return '';
        let valueForCurrentControl = row[this.inputElement.refPropertyName];
        let relatedControlsValues: string[] = [];
        for (let relatedControl of Object.values(this.autoCompleteState.controls)) {
            if (relatedControl.propertyName === this.inputElement.propertyName) continue;
            relatedControlsValues.push(this.i18npipe.transform(relatedControl.propertyName) + ': '
                + row[relatedControl.propertyName]);
        }

        return valueForCurrentControl + " (" + relatedControlsValues.join(", ") + ")";
    }

    @ViewChild("input") inputField: ElementRef;
    selectOption(option: {}) {
        this.popupOpened = false;
        this.currentSearchTxt = null;
        this.frmdbStreams.action(new UserChoseAutocompleteOption(option, this.inputElement));
        this.inputField.nativeElement.focus();
    }
}
