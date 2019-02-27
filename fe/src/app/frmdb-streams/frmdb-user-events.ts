import { DataObj } from "@core/domain/metadata/data_obj";
import { NodeElement } from "@core/domain/uimetadata/form";
import { Table } from "@core/domain/uimetadata/table";

export interface UserModifiedFormData {
    type: 'UserModifiedFormData';
    obj: DataObj;
}
export interface UserDraggedFormElement {
    type: 'UserDraggedFormElement';
    nodeElement: NodeElement | null;
}
export interface UserSelectedCell {
    type: 'UserSelectedCell';
    columnName: string;
}
export interface UserSelectedRow {
    type: 'UserSelectedRow';
    dataObj: DataObj;
}
export interface UserModifiedTableUi {
    type: 'UserModifiedTableUi';
    table: Table;
}

export type UserEvent = 
    | UserModifiedFormData
    | UserDraggedFormElement
    | UserSelectedCell
    | UserSelectedRow
    | UserModifiedTableUi
;
