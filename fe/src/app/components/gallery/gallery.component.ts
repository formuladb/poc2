import { Component, OnInit } from '@angular/core';
import { FormEditingService } from '../form-editing.service';
import { BaseNodeComponent } from '../base_node';

export class GalleryComponent extends BaseNodeComponent implements OnInit {

  constructor(formEditingService: FormEditingService) {
    super(formEditingService);
  }

  ngOnInit() {
  }

}
