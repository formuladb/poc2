/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import {
    Grid, GridOptions,
    GridApi, GridReadyEvent,
    RowDoubleClickedEvent, ColumnResizedEvent, ColumnMovedEvent,
    RowClickedEvent, CellFocusedEvent, ColDef, VanillaFrameworkOverrides
} from 'ag-grid-community';
import { LicenseManager } from 'ag-grid-enterprise';
import * as _ from 'lodash';
import { waitUntilNotNull, PickOmit, objKeysTyped } from '@domain/ts-utils';

import { elvis } from '@core/elvis';
import { DataGridToolsComponent } from './data-grid-tools.component';
import { DataGrid, TableColumn } from '@domain/uimetadata/node-elements';
import { scalarFormulaEvaluate } from '@core/scalar_formula_evaluate';
import { DataObj } from '@domain/metadata/data_obj';
import { ExcelStyles } from './excel-styles';
import { FrmdbElementBase, FrmdbElementDecorator } from '@fe/live-dom-template/frmdb-element';
import { I18N } from '@fe/i18n.service';
import { TABLE_SERVICE } from '@fe/table.service';
import { Pn, FormulaExpression } from '@domain/metadata/entity';
import { translateClicksToNavigationEvents } from '@fe/event-translator';
import { onEvent, emit } from '@fe/delegated-events';

/** Component constants (loaded by webpack) **********************************/
const HTML: string = require('raw-loader!@fe-assets/data-grid/data-grid.component.html').default;
const CSS: string = require('!!raw-loader!sass-loader?sourceMap!@fe-assets/data-grid/data-grid.component.scss').default;
export interface DataGridComponentAttr {
    table_name: string;
    header_height?: number;
    expand_row?: boolean;
}

export interface DataGridComponentState extends DataGridComponentAttr {
    highlightColumns?: [{ tableName: string, columnName: string }];
    conditionalFormatting?: { tbdCssClassName: string };
}

@FrmdbElementDecorator({
    tag: 'frmdb-data-grid',
    observedAttributes: ["table_name", "header_height" , "expand_row"],
    template: HTML,
    style: CSS,
})
export class DataGridComponent extends FrmdbElementBase<DataGridComponentAttr, DataGridComponentState> {

    /** web components API **************************************************/
    attributeChangedCallback(attrName: keyof DataGridComponentAttr, oldVal, newVal) {
        if (!this.gridApi) return;
        if (attrName == 'table_name') {
            this.initAgGrid();
        } else if ("TODOO how to pass in events from outside ServerDeletedFormData" == "TODOO how to pass in events from outside ServerDeletedFormData") {
            this.gridApi.purgeServerSideCache()
        }
    }

    connectedCallback() {
        this.style.minWidth = "28vw";
        this.style.minHeight = "25vh";
        this.style.height = "100%";
        this.style.display = "block";

        new Grid(this.shadowRoot!.querySelector("#myGrid") as HTMLElement, this.gridOptions);
        translateClicksToNavigationEvents(this.shadowRoot!);
        this.initAgGrid();
    }


    constructor() {
        super();

        // tslint:disable-next-line:max-line-length
        // LicenseManager.setLicenseKey('Evaluation_License-_Not_For_Production_Valid_Until_14_March_2019__MTU1MjUyMTYwMDAwMA==8917c155112df433b2b09086753e8903');
        LicenseManager.setLicenseKey('Evaluation_License-_Not_For_Production_Valid_Until_8_April_2020__MTU4NjMwMDQwMDAwMA==4c5e7874be87bd3e2fdc7dd53041fbf7');
    }

    /** frmdb components API **************************************************/
    frmdbPropertyChangedCallback<T extends keyof DataGridComponentState>(propName: keyof DataGridComponentState, oldVal: DataGridComponentState[T] | undefined, newVal: DataGridComponentState[T]): Partial<DataGridComponentState> | Promise<Partial<DataGridComponentState>> {
        if (propName === "highlightColumns" || propName === "conditionalFormatting") {
            if (this.gridApi) {
                this.gridApi.refreshCells({ force: true });
            }
        }
        return this.frmdbState;
    }

    /** component internals *************************************************/

    private gridApi: GridApi;
    private gridColumnApi;
    private agGridColumns: ColDef[] = [];
    private filters: any = {};
    private sort: any = {};
    private columns: TableColumn[] = [];

    private gridOptions: GridOptions = {

        headerHeight: 50,
        suppressContextMenu: true,
        onGridSizeChanged: this.onGridSizeChanged.bind(this),
        components: {
            // agColumnHeader: TableHeaderComponent,
            tableActionsToolPanel: DataGridToolsComponent,
        },
        defaultColDef: {
            width: 100,
            headerComponentParams: { menuIcon: 'fa-bars' }
        },
        onRowDoubleClicked: (event: RowDoubleClickedEvent) => {
            this.emit({ type: "UserDblClickRow", dataObj: event.data });
        },
        onRowClicked: (event: RowClickedEvent) => {
            this.emit({ type: "UserSelectedRow", dataObj: event.data });
        },
        onCellFocused: (event: CellFocusedEvent) => {
            if (event.column && event.column.getColDef() && event.column.getColDef().field) {
                this.emit({ type: "UserSelectedCell", columnName: event.column.getColDef().field! });
            }
        },
        autoGroupColumnDef: { width: 150 },
        onGridReady: (params: GridReadyEvent) => {
            if (!this.gridApi) {
                this.gridApi = params.api as GridApi;
                this.gridColumnApi = params.columnApi;
                this.gridApi.closeToolPanel();
            }
            console.debug("onGridReady", this.columns, this.gridApi);
        },
        onColumnMoved: (event: ColumnMovedEvent) => {
            // this.frmdbStreams.userEvents$.next({type: "UserModifiedTableUi", table: this.tableState});
        },
        onColumnResized: (event: ColumnResizedEvent) => {
            if (event.finished && event && event.column) {
                const col = (this.columns || [])
                    .find(c => c.name !== null && event !== null && event.column !== null && c.name === event.column.getId());
                if (col) { col.width = event.column.getActualWidth(); }
                // this.frmdbStreams.userEvents$.next({type: "UserModifiedTableUi", table: this.tableState});
            }
        },
        floatingFilter: true,
        onFilterChanged: (event: any) => {
            if (!_.isEqual(this.filters, this.gridApi.getFilterModel())) {
                const fs = this.gridApi.getFilterModel();
                (this.columns || []).forEach(c => {
                    if (fs[c.name]) {
                        c.filter = { operator: fs[c.name].type, value: fs[c.name].filter };
                    } else {
                        c.filter = undefined;
                    }
                });
                // this.emit({ type: "UserModifiedTableUi", table: this.dataGrid });
            }
            this.filters = this.gridApi.getFilterModel();
        },
        onSortChanged: (event: any) => {
            if (!_.isEqual(this.sort, this.gridApi.getSortModel())) {
                const srt = this.gridApi.getSortModel();
                (this.columns || []).forEach(c => {
                    const s = srt.find(i => i.colId === c.name);
                    if (s) {
                        c.sort = s.sort;
                    } else {
                        c.sort = undefined;
                    }
                });
                // this.frmdbStreams.userEvents$.next({type: "UserModifiedTableUi", table: this.tableState});
            }
            this.sort = this.gridApi.getSortModel();
        },
        onFirstDataRendered: ($event) => {
            var allColumnIds: any[] = [];
            (this.gridColumnApi.getAllColumns() || []).forEach(function (column) {
                allColumnIds.push(column.colId);
            });
            // this.gridColumnApi.autoSizeColumns(allColumnIds);
        },
        suppressClipboardPaste: true,
        rowModelType: "serverSide",
        enableRangeSelection: true,
        statusBar: {
            statusPanels: [
                { statusPanel: 'agSelectedRowCountComponent' },
                { statusPanel: 'agAggregationComponent' }
            ],
        },
        sideBar: {
            toolPanels: [
                {
                    id: "tableActions",
                    labelDefault: "Optiuni Tabel",
                    labelKey: "tableActions",
                    iconKey: "table-actions",
                    toolPanel: "tableActionsToolPanel"
                },
                {
                    id: 'columns',
                    labelDefault: 'Columns',
                    labelKey: 'columns',
                    iconKey: 'columns',
                    toolPanel: 'agColumnsToolPanel',
                    // toolPanelParams: {
                    //     suppressPivots: true,
                    //     suppressPivotMode: true
                    // }
                }
            ],
            defaultToolPanel: 'tableActions'
        },
        excelStyles: _.cloneDeep(ExcelStyles),
    };

    applyCellStyles(params) {
        let entityName = this.frmdbState.table_name;
        let hc = this.frmdbState.highlightColumns||{};
        if (entityName && hc[entityName] && hc[entityName][params.colDef.field]) {
            return { backgroundColor: hc[entityName][params.colDef.field].replace(/^c_/, '#') };
        }
        return null;
    }

    agFilter(ctype: string) {
        switch (ctype) {
            case 'STRING':
                return 'agTextColumnFilter';
            case 'NUMBER':
                return 'agNumberColumnFilter';
            case 'DATE':
                return 'agDateColumnFilter';
            case 'FORMULA':
                return 'agTextColumnFilter';
            default:
                return null;
        }
    }

    async initAgGrid() {
        console.debug("ngOnInit", this, this.gridApi);
        if (!this.frmdbState.table_name) return;

        this.columns = await TABLE_SERVICE.getColumns(this.frmdbState.table_name);

        this.gridOptions.context = this.columns;
        this.gridOptions.headerHeight = this.frmdbState.header_height || 25;
        // if (this.dataGrid.headerBackground) this.gridOptions.excelStyles!.find(s => s.id === "header")!.interior = {
        //     //FIXME: setting header background does not seem to work
        //     color: this.dataGrid.headerBackground,
        //     pattern: "Solid",
        // };
        await waitUntilNotNull(() => Promise.resolve(this.gridApi));
        this.gridApi.setServerSideDatasource(TABLE_SERVICE.getDataSource(this.frmdbState.table_name));
        try {

            let cssClassRules: ColDef['cellClassRules'] = {};
            let conditionalFormatting = this.frmdbState.conditionalFormatting || {};
            for (let cssClassName of Object.keys(elvis(conditionalFormatting))) {
                cssClassRules[cssClassName] = function (params) {
                    return scalarFormulaEvaluate(params.data || {}, conditionalFormatting[cssClassName]);
                }
            }
            let cols = this.columns || [];

            this.agGridColumns = cols.map(c => <ColDef>{
                headerName: I18N.tt(c.name),
                field: c.name,
                width: c.width ? c.width : 100,
                filter: this.agFilter(c.type || Pn.STRING),
                filterParams: {
                    newRowsAction: 'keep',
                },
                enableRowGroup: true,
                enableValue: true,
                resizable: true,
                valueFormatter: (params) => this.valueFormatter(params),
                cellRenderer: this.getCellRenderer(c),
                cellStyle: (cp: any) => this.applyCellStyles(cp),
                cellClassRules: cssClassRules,
            });

            const fs = {};
            cols.filter(c => c.filter)
                .forEach(c => {
                    if (c.filter) {
                        fs[c.name] = { type: c.filter.operator, filter: c.filter.value, filterType: 'text' };
                    }
                });

            this.gridApi.setColumnDefs(this.agGridColumns);
            try {
                this.gridApi.setFilterModel(fs);
                this.gridApi.setSortModel(cols.filter(c => c.sort !== null)
                    .map(c => <any>{ colId: c.name, sort: c.sort }));
                this.gridApi.setHeaderHeight(this.gridOptions.headerHeight);
            } catch (err) {
                console.error(err);
            }

        } catch (ex) {
            console.error(ex);
        }
    }
    ngOnDestroy(): void {
    }

    onGridSizeChanged() {
        if (!this.gridApi) return;
        // this.gridApi.sizeColumnsToFit();
    }

    valueFormatter(params) {
        if (params.colDef.field === '_id') return ((params.value || '')+'').replace(/^.*~~/, '');
        else return params.value;
    }

    userSelectTableRow(dataObj: DataObj) {
        this.emit({ type: "UserSelectedRow", dataObj });
    }

    getCellRenderer(col: TableColumn) {
        if (this.frmdbState.expand_row && col.name === '_id') {
            return (params) => {
                return `<a href="${window.location.pathname}/../${params.data._id}" data-frmdb-link="main">${this.valueFormatter(params)}</a>`;
            }
        } else return null;
    }
}
