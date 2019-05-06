import { Injectable } from "@angular/core";
import { Store } from "@ngrx/store";

import { Entity, EntityProperty, EntityProperties } from "@core/domain/metadata/entity";
import { Page, FrmdbLy } from "@core/domain/uimetadata/page";
import { FormPage, getFormPageEntityId } from "@core/domain/uimetadata/form-page";
import { TablePage, getTablePageEntityId } from "@core/domain/uimetadata/table-page";
import { NodeElementWithChildren, FormTable, FormTabs, FormAutocomplete, NodeType, FormDatepicker, FormText, FormInput, GridRow, NodeElement, isNodeElementWithChildren, Button, CardContainer, ScalarNodeElement, DataGrid, TableColumn } from "@core/domain/uimetadata/node-elements";

import * as _ from "lodash";

import { Pn } from "@core/domain/metadata/entity";

import { generateUUID } from "@core/domain/uuid";
import { elvis } from "@core/elvis";

import * as appState from '../state/app.state';

let AUTOLAYOUTSERVICE: AutoLayoutService | undefined = undefined;

export function autoLayoutFormPage(formPage: FormPage, entity?: Entity, layout?: FrmdbLy): FormPage {
    if (AUTOLAYOUTSERVICE) {
        return AUTOLAYOUTSERVICE.autoLayoutFormPage(formPage, entity, layout);
    } else return formPage;
}

export function autoLayoutTablePage(tablePage: FormPage, entity?: Entity, layout?: FrmdbLy): TablePage {
    if (AUTOLAYOUTSERVICE) {
        return AUTOLAYOUTSERVICE.autoLayoutTable(tablePage, entity, layout);
    } else return tablePage;
}

@Injectable()
export class AutoLayoutService {
    private cachedEntitiesMap: _.Dictionary<Entity> = {};

    constructor(private store: Store<appState.AppState>) {
        this.store.select (appState.getEntitiesState).subscribe(entities => {
            entities.forEach(entity => this.cachedEntitiesMap[entity._id] = entity);
        });

        AUTOLAYOUTSERVICE = this;
    }

    public autoLayoutFormPage(formPage: FormPage, entity?: Entity, layout?: FrmdbLy): FormPage {
        if (entity) this.cachedEntitiesMap[entity._id] = entity;
        let retForm: FormPage = {...formPage};

        retForm.isEditable = elvis(entity).isEditable;
        retForm.stateGraph = elvis(entity).stateGraph;
        retForm.layout = layout || retForm.layout || FrmdbLy.ly_admin;

        this.autoLayoutChildren(retForm.layout!, retForm, (entity || this.cachedEntitiesMap[getFormPageEntityId(formPage)]).props);

        console.log('form:', retForm);
        return retForm;
    }

    public autoLayoutChildren(layout: FrmdbLy, parentFormEl: NodeElementWithChildren, entityProps: EntityProperties) {
        let referenceToDataGrids: Map<string, DataGrid> = new Map();
        parentFormEl.childNodes = _.values(entityProps).map(pn => {
            let child: NodeElement;

            if (pn.propType_ === Pn.CHILD_TABLE) {
                let base = {
                    _id: generateUUID(),
                    tableName: pn.name,
                    refEntityName: pn.referencedEntityName,
                }
                if (FrmdbLy.ly_mosaic === layout || FrmdbLy.ly_fpattern === layout) {
                    child = {
                        ...base,
                        nodeType: NodeType.card_container,
                        layout: layout,
                    };
                } else if (pn.isLargeTable) {
                    child = {
                        ...base,
                        nodeType: NodeType.form_table,
                    }
                } else {
                    child = {
                        ...base,
                        nodeType: NodeType.form_tabs,
                        tabNameFormPath: "_id",//FIXME: heuristic look for child properties "name"/"title"
                    }
                }

                if (pn.referencedEntityName) this.autoLayoutChildren(layout, child, this.cachedEntitiesMap[pn.referencedEntityName]!.props);
            } else if (pn.propType_ === Pn.REFERENCE_TO) {
                if (FrmdbLy.ly_fpattern === layout) {
                    child = referenceToDataGrids.get(pn.referencedEntityName) || {
                        _id: generateUUID(),
                        nodeType: NodeType.data_grid,
                        layout: layout,
                        autocompleteProperties: [],
                        refEntityName: pn.referencedEntityName,
                    };
                    referenceToDataGrids.set(pn.referencedEntityName, child);

                    child.autocompleteProperties!.push({
                        _id: generateUUID(),
                        nodeType: NodeType.form_input,
                        refPropertyName: pn.referencedPropertyName,
                        propertyName: pn.name,
                        propertyType: /**FIXME!!!!! hardcoded heuristic */
                            ["price"].includes(pn.referencedPropertyName) ? Pn.NUMBER : Pn.STRING,
                    })
                } else {
                    child = {
                        _id: generateUUID(),
                        nodeType: NodeType.form_autocomplete,
                        propertyName: pn.name,
                        refEntityName: pn.referencedEntityName,
                        refPropertyName: pn.referencedPropertyName,
                    }
                }
            } else if (pn.propType_ === Pn.DATETIME) {
                child = {
                    _id: generateUUID(),
                    nodeType: NodeType.form_datepicker,
                    propertyName: pn.name,
                };
            } else if (pn.propType_ === Pn.IMAGE) {
                child = {
                    _id: generateUUID(),
                    nodeType: NodeType.image,
                };
            } else if (pn.propType_ === Pn.ATTACHMENT) {
                child = {
                    _id: generateUUID(),
                    nodeType: NodeType.image,
                };
            } else if (pn.propType_ === Pn.EXTENDS_ENTITY) {
                child = {
                    _id: generateUUID(),
                    nodeType: NodeType.data_grid,
                    refEntityName: pn.referencedEntityName,
                };
            } else if (pn.propType_ === Pn.ACTION) {
                child = {
                    _id: generateUUID(),
                    nodeType: NodeType.button,
                    propertyName: pn.name,
                };
            } else if (pn.propType_ === Pn.STRING && pn.name == '_id') {
                child = {
                    _id: generateUUID(),
                    nodeType: NodeType.form_text,
                    propertyName: pn.name,
                    propertyType: pn.propType_,
                    representation: "_id",
                };
            } else {
                let propertyType = pn.propType_ === Pn.FORMULA ? Pn.STRING : pn.propType_;//FIXME: compute FORMULA return type

                if (FrmdbLy.ly_admin === layout || FrmdbLy.ly_form === layout) {
                    child = {
                        _id: generateUUID(),
                        nodeType: NodeType.form_input,
                        propertyName: pn.name,
                        propertyType: propertyType,
                        noLabel: parentFormEl.nodeType === NodeType.form_table,
                    };
                } else {
                    child = {
                        _id: generateUUID(),
                        nodeType: NodeType.form_text,
                        propertyName: pn.name,
                        propertyType: propertyType,
                        representation: "_id",
                        noLabel: parentFormEl.nodeType === NodeType.form_table,
                    };
                }
            }

            let ret;
            if (parentFormEl.nodeType === NodeType.form_table) {
                ret = child;
            } else {
                ret = {
                    _id: generateUUID(),
                    nodeType: NodeType.grid_row,
                    childNodes: [child],
                };
            }

            return ret;
        });
    }

    public autoLayoutTable(table: TablePage, entity?: Entity, layout?: FrmdbLy): TablePage {
        if (entity) this.cachedEntitiesMap[entity._id] = entity;
        const retTable: TablePage = {...table};
        entity = entity || this.cachedEntitiesMap[getTablePageEntityId(table)];
    
        retTable.layout = layout || elvis(table).layout || FrmdbLy.ly_admin;
        if (retTable.layout === FrmdbLy.ly_admin) {
            
            retTable.childNodes = [{
                _id: generateUUID(),  
                nodeType: NodeType.data_grid,
                refEntityName: entity._id,
                columns: _.values(entity.props).map(pn => ({
                    _id: generateUUID(),
                    name: pn.name, 
                    type: pn.propType_
                } as TableColumn))
            }];
        } else {
            this.autoLayoutChildren(retTable.layout!, retTable, {
                [entity._id]: { name: entity._id, propType_: Pn.CHILD_TABLE, referencedEntityName: entity._id }
            });
        }
        
        return retTable;
    }
    
}
