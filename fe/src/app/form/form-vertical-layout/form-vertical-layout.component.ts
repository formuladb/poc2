import { Component, OnInit, Input, HostBinding } from '@angular/core';
import { BaseNodeComponent } from '../base_node';
import { FormGroup } from '@angular/forms';
import { NodeElementWithChildren, NodeElement, getChildPath } from "@core/domain/uimetadata/form";
import * as _ from 'lodash';
import { Store } from '@ngrx/store';
import * as fromForm from '../form.state';
import { Observable } from 'rxjs';
import { FrmdbStreamsService } from '@fe/app/frmdb-streams/frmdb-streams.service';

export class FormVerticalLayoutComponent implements OnInit {

  @Input()
  nodeElement: NodeElementWithChildren;

  @Input()
  topLevelFormGroup: FormGroup;

  @Input()
  parentFormPath: string;

  @Input()
  formReadOnly: boolean;

  @HostBinding("class.outline")
  editMode: boolean;

  constructor(protected frmdbStreams: FrmdbStreamsService) {
    frmdbStreams.devMode$.subscribe(e => this.editMode = e);
  }

  ngOnInit() {
  }

  getChildPath(childEl: NodeElement) {
    let formPath = _.isEmpty(this.parentFormPath) ? [] : [this.parentFormPath]
    let childPath: string | null = null;
    childPath = getChildPath(childEl);
    if (childPath) formPath.push(childPath);
    return formPath.join('.');
  }

}
