/**
* © 2018 S.C. FORMULA DATABASE S.R.L.
* License TBD
*/

import { FormPage } from '@domain/uimetadata/form-page'
import { Home } from './website-metadata';
import { TablePage } from '@domain/uimetadata/table-page';
import { FrmdbLy, FrmdbHeader } from '@domain/uimetadata/page';
import { NodeType, DataGrid } from '@domain/uimetadata/node-elements';

let testUUID = 1;
function getTestUUID() {
    return 'uuid' + ++testUUID;
}

export var HomePage_Form: FormPage = {
    _id: "FormPage:ALL^^" + Home._id,
    nodeType: NodeType.root_node,
    logoUrl: '/assets/icon2.128.png',
    header: "frmdb-hd-cover",
    layout: "frmdb-ly-cards",
    childNodes: [],
};

export var HomePage_Table: TablePage = {
    _id: "TablePage:ALL^^" + Home._id,
    nodeType: NodeType.root_node,
    logoUrl: '/assets/icon2.128.png',
    header: "frmdb-hd-cover",
    layout: "frmdb-ly-cards",
    childNodes: [
        { nodeType: NodeType.data_grid, _id: getTestUUID(), refEntityName: Home._id },
    ]
};