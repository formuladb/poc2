import { Component, OnChanges, OnInit } from '@angular/core';
import { BaseNodeComponent } from "./../base_node";

import { NodeElement, NodeType, isEntityNodeElement, isNodeElementWithChildren } from "../../domain/uimetadata/form";
import { FormControl, FormGroup, AbstractControl } from '@angular/forms';

@Component({
  selector: '[form_table]',
  host: { class: "col" },
  templateUrl: 'form_table.component.html',
  styleUrls:['form_table.component.scss']
})
export class FormTableComponent extends BaseNodeComponent implements OnChanges {

  constructor() {
    super();
  }

  ngOnChanges() {
    console.log(this.nodeElement, this.topLevelFormGroup);
  }

  getCopiedPropertyName(child: NodeElement, idx: number) {
    let ret = null;
    if (isEntityNodeElement(child)) ret = child.copiedProperties[idx];
    if (!ret) {
      console.error("copiedProperties does not have enough elements: ", child, idx);
      ret = 'NOT-FOUND-' + idx;
    }
    return ret;
  }

  getChildProperties(child: NodeElement, idx: number): AbstractControl[] {
    if (!isEntityNodeElement(child)) throw new Error("childProperties are not available for node: " + child);
    let ret: AbstractControl[] = [];
    
    let subForm: FormGroup = this.topLevelFormGroup.get(this.parentFormPath + '.' + idx + '.' + child.entityName) as FormGroup;
    if (subForm !== null) {
      for (var ck in subForm.controls) {
        ret.push(subForm.controls[ck]);
      }
    }
    return ret;
  }

}