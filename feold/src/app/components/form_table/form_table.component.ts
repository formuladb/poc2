/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { OnChanges, OnInit, OnDestroy, Component } from '@angular/core';
import { BaseNodeComponent } from '../base_node';
import { NodeElement, NodeType, TableNodeElement, FormTabs, FormTable } from "@domain/uimetadata/node-elements";
import { CircularJSON } from "@domain/json-stringify";

import { Pn } from "@domain/metadata/entity";
import { FormEditingService } from '../form-editing.service';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { FrmdbFormControl, FrmdbFormGroup } from '../frmdb-page.component';


@Component({
  // tslint:disable-next-line:component-selector
  selector: '[frmdb-form_table]',
  host: { class: 'col form-group' },
  templateUrl: './form_table.component.html',
  styleUrls: ['./form_table.component.scss']
})
export class FormTableComponent extends BaseNodeComponent implements OnInit, OnChanges, OnDestroy {

  addIcon = faPlusCircle;
  delIcon = faMinusCircle;

  constructor(formEditingService: FormEditingService) {
    super(formEditingService);
  }

  tableElement: FormTable | FormTabs;

  ngOnInit() {
    this.tableElement = this.nodel as FormTable | FormTabs;
    console.debug(this.fullpath, this.nodel, this.formgrp);
  }

  ngOnChanges() {
  }
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  getType(child: NodeElement): string {
    if (child.nodeType !== NodeType.form_input) {
      throw new Error('form-input node element is wrong: ' + CircularJSON.stringify(this.nodel));
    }
    if (child.propertyType === Pn.NUMBER) { return 'number'; } else { return 'text'; }
  }

  addRow() {
    this.addChildDataObj();
  }

  deleteRow(control: FrmdbFormGroup) {
    let obj = control.getRawValue();
    if (obj._id && confirm("Are you sure you want to delete row " + obj._id + " ?")) {
      this.frmdbStreams.userEvents$.next({ type: "UserDeletedFormData", obj });
    }
  }
}