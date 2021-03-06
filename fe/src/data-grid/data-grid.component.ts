/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import {
    Grid, GridOptions,
    GridApi, GridReadyEvent,
    RowDoubleClickedEvent, ColumnResizedEvent, ColumnMovedEvent,
    RowClickedEvent, CellFocusedEvent, ColDef, 
    RefreshCellsParams, GetMainMenuItemsParams, MenuItemDef,
    ModuleRegistry
} from '@ag-grid-community/core';
import { InfiniteRowModelModule } from '@ag-grid-community/infinite-row-model';
ModuleRegistry.registerModules([
    InfiniteRowModelModule,
]);

import * as _ from 'lodash';
import { waitUntil } from '@domain/ts-utils';

import { elvis } from '@core/elvis';
import { scalarFormulaEvaluate } from '@core/scalar_formula_evaluate';
import { DataObj } from '@domain/metadata/data_obj';
import { ExcelStyles } from './excel-styles';
import { I18N } from '@fe/i18n.service';
import { TABLE_SERVICE, TableColumn } from '@fe/table.service';
import { Pn, EntityProperty } from '@domain/metadata/entity';
import { CURRENT_COLUMN_HIGHLIGHT_STYLE } from '@domain/constants';
import { DataGridComponentI } from './data-grid.component.i';
import { emit, getTarget } from '@fe/delegated-events';
import { SimpleAddHocQueryFilterItem, SimpleAddHocQuery } from '@domain/metadata/simple-add-hoc-query';

/** Component constants (loaded by webpack) **********************************/
const HTML: string = require('raw-loader!@fe-assets/data-grid/data-grid.component.html').default;
const CSS: string = require('!!raw-loader!sass-loader?sourceMap!@fe-assets/data-grid/data-grid.component.scss').default;

export class DataGridComponent extends HTMLElement implements DataGridComponentI {
    /** example:
        "conditionalFormatting": {
            "yellowBackground": "ISNUMBER(FIND(\"-total\", _id))"
        }*/
    conditionalFormatting?: { tbdCssClassName: string };
    selectedRow: DataObj;
    selectedColumnName: string;

    get elem() { return this.shadowRoot! }

    private _highlightColumns: DataGridComponentI['highlightColumns'] = {};
    get highlightColumns() { return this._highlightColumns }
    set highlightColumns(hc: DataGridComponent['_highlightColumns']) {
        this._highlightColumns = hc;
        this.debouncedForceCellRefresh();
    }
    get noFloatingFilters() {
        return ('true' === (this.getAttribute("no-floating-filters") || '').toLowerCase());
    }
    get headerHeight() {
        return parseInt(this.getAttribute("header-height") || '') || 28;
    }
    get tableName() {
        return this.getAttribute("table-name") || undefined;
    }
    get expandRow() {
        return this.getAttribute("expand-row") || undefined;
    }
    get applyI18n(): boolean {
        return this.hasAttribute("apply-i18n") ? this.getAttribute("apply-i18n")?.toUpperCase() === "TRUE" : true;
    }

    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = `<style>${CSS}</style> ${HTML}`;
        new Grid(this.elem.querySelector("#myGrid") as HTMLElement, this.gridOptions);
    }

    /** web components API **************************************************/
    static observedAttributes = ["table-name", "header-height", "expand-row", "no-floating-filters"];
    attributeChangedCallback(attrName: string, oldVal, newVal) {
        waitUntil(() => Promise.resolve(this.gridApi), 2500)
            .then(() => {
                if (!this.gridApi) throw new Error("Timeout during initialization");
                if (attrName == 'table-name') {
                    this.initAgGrid();
                } else if ("TODOO how to pass in events from outside ServerDeletedFormData" == "TODOO how to pass in events from outside ServerDeletedFormData") {
                    this.gridApi.purgeServerSideCache()
                }
            });
    }

    connectedCallback() {
    }

    /** component internals *************************************************/

    debouncedForceCellRefresh = _.debounce(() => this._forceCellRefresh(), 200);
    gridIsRefreshing: boolean = false;
    public _forceCellRefresh() {
        if (this.gridIsRefreshing) {
            this.debouncedForceCellRefresh();
            return;
        }
        this.gridIsRefreshing = true;
        this.gridApi && this.gridApi.refreshCells({force: true});
        this.gridIsRefreshing = false;
    }
    public forceReloadData = _.debounce(() => this._forceReloadData(), 200);
    private _forceReloadData() {
        if (this.gridApi) {
            this.gridApi.purgeInfiniteCache();
            this.gridApi.refreshCells({force: true})
        }
    }

    private gridApi: GridApi;
    private gridColumnApi;
    private agGridColumns: ColDef[] = [];
    private filters: any = {};
    private sort: any = {};
    private columns: TableColumn[] = [];
    private selectedRowIdx: number;
    
    getFilterModel(): SimpleAddHocQuery['filterModel'] {
        return this.gridApi.getFilterModel();
    }

    private gridOptions: GridOptions = {

        headerHeight: 28,
        suppressContextMenu: true,
        onGridSizeChanged: this.onGridSizeChanged.bind(this),
        components: {
            // agColumnHeader: TableHeaderComponent,
        },
        defaultColDef: {
            width: 100,
            sortable: true,
            headerComponentParams: { menuIcon: 'fa-bars' }
        },
        onRowDoubleClicked: (event: RowDoubleClickedEvent) => {
            emit(this, { type: "UserDblClickRow", dataObj: event.data });
        },
        onRowClicked: (event: RowClickedEvent) => {
            this.selectedRow = event.data;
            emit(this, { type: "UserSelectedRow", dataObj: event.data });
        },
        onCellFocused: (event: CellFocusedEvent) => {
            let newSelectedRowIdx = event.rowIndex;
            let newSelectedColumnName: string | null = null;
            if (event.column && event.column.getColDef() && event.column.getColDef().field) {
                newSelectedColumnName = event.column.getColDef().field!;
            }
            let refreshCellsParams: RefreshCellsParams | null = null;
            if (this.selectedRowIdx != newSelectedRowIdx || this.selectedColumnName != newSelectedColumnName) {
                refreshCellsParams = {
                    rowNodes: [
                        this.gridApi.getDisplayedRowAtIndex(this.selectedRowIdx || 0),
                        this.gridApi.getDisplayedRowAtIndex(newSelectedRowIdx)
                    ],
                    columns: [this.selectedColumnName || '_id', newSelectedColumnName || '_id'],
                    force: true,
                };
            }
            this.selectedColumnName = newSelectedColumnName || this.selectedColumnName;
            this.selectedRowIdx = event.rowIndex;
            emit(this, { type: "UserSelectedCell", columnName: this.selectedColumnName });

            if (refreshCellsParams && this.gridApi) {
                // this.gridApi.refreshCells(refreshCellsParams);
                //FIXME: the targeted cell refresh does not call the applyCellStyles method
                this.gridApi.refreshCells({ force: true });
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
                emit(this, { type: "UserFilterTable", tableName: this.tableName || '' , filterModel: this.getFilterModel() });
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
        rowModelType: "infinite",
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
                    labelDefault: "",
                    labelKey: "tableActions",
                    iconKey: "menu",
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
        let entityId = this.tableName;
        let hc = this._highlightColumns || {};

        let backgroundStyles: { [k: string]: string | null } = {
            backgroundColor: null,
            'background-image': null,
            'background-size': null,
        };

        let borderStyles: { [k: string]: string | null } = {
            "border-color": null,
        }

        if (entityId && hc[entityId] && (
            hc[entityId][params.colDef.field]
            || params.data?._id == hc['$HIGHLIGHT-RECORD$']?._id
        )){
            let highightColor = hc[entityId][params.colDef.field] || 
                Object.values(hc[entityId])[0];
            if (typeof highightColor === "string") {
                backgroundStyles = {
                    ...backgroundStyles,
                    backgroundColor: highightColor.replace(/^c_/, '#'),
                };
            } else {
                backgroundStyles = {
                    ...backgroundStyles,
                    ...highightColor,
                };
            }
        }
        else if (params.node.rowIndex == this.selectedRowIdx && params.colDef.field == this.selectedColumnName) {
            borderStyles = { "border-color": "blue" };
        } else if (params.node.rowIndex != this.selectedRowIdx && params.colDef.field == this.selectedColumnName) {
            backgroundStyles = {
                ...backgroundStyles,
                backgroundColor: '#eceeef',
            };
        }
        return { ...backgroundStyles, ...borderStyles };
    }

    agFilter(prop: EntityProperty) {
        switch (prop.propType_) {
            case Pn.INPUT:
                switch (prop.actualType.name) {
                case 'NumberType':
                    return 'agNumberColumnFilter';
                case 'DatetimeType':
                    return 'agDateColumnFilter';
                    default:
                        return 'agTextColumnFilter';
                }
            case Pn.SCALAR_FORMULA://TODO: get actual type
            case Pn.AGGREGATE_FORMULA://TODO: get actual type
                return 'agTextColumnFilter';
            default:
                return 'agTextColumnFilter';
        }
    }

    public async initAgGrid() {
        console.debug("ngOnInit", this, this.gridApi);
        let tableName = this.tableName;
        if (!tableName) return;

        this.columns = await TABLE_SERVICE.getColumns(tableName);

        this.gridOptions.floatingFilter = !this.noFloatingFilters;
        this.gridOptions.context = this.columns;
        this.gridOptions.headerHeight = this.headerHeight;
        // if (this.dataGrid.headerBackground) this.gridOptions.excelStyles!.find(s => s.id === "header")!.interior = {
        //     //FIXME: setting header background does not seem to work
        //     color: this.dataGrid.headerBackground,
        //     pattern: "Solid",
        // };
        await waitUntil(() => Promise.resolve(this.gridApi));
        this.gridApi.setDatasource(TABLE_SERVICE.getDatasource(tableName));
        try {

            let cssClassRules: ColDef['cellClassRules'] = {};
            let conditionalFormatting = this.conditionalFormatting || {};
            for (let cssClassName of Object.keys(elvis(conditionalFormatting))) {
                cssClassRules[cssClassName] = function (params) {
                    return scalarFormulaEvaluate(params.data || {}, conditionalFormatting[cssClassName]);
                }
            }
            let cols = this.columns || [];

            await I18N.waitForDictionary();
            this.agGridColumns = cols.filter(c => !['_owner', '_role', '_rev'].includes(c.name)).map(c => <ColDef>{
                headerName: this.applyI18n ? I18N.tt(c.name) : c.name,
                field: c.name,
                width: c.width ? c.width : 100,
                filter: this.agFilter(c.entityProperty),
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
        if (params.colDef.field === '_id') return ((params.value || '') + '').replace(/^.*~~/, '');
        else return params.value;
    }

    getCellRenderer(col: TableColumn) {
        let entityId = this.tableName;
        let expandRowTarget = this.expandRow;
        if (expandRowTarget && col.name === '_id') {
            return (params) => {
                return `<a href="javascript:void(0)" onclick="m=this.ownerDocument.querySelector('${expandRowTarget}'); f=m.querySelector('frmdb-form'); f.rowId='${params.value}'; $FRMDB_MODAL(m)"><i class="frmdb-i-edit"></i></a> ${this.valueFormatter(params)}`;
            }
        } else if (this.columns.find(c => c.name === col.name)?.entityProperty.propType_ === Pn.REFERENCE_TO) {
            return (params) => {
                return `<a href="javascript:void(0)" onclick="$FRMDB_EDITOR.HDGR('${params.value}', '_id')"><i class="frmdb-i-1630227-link"></i></a> ${params?.value?.replace(/^.*~~/, '')}`;
            }
        } else {
            return null;
        }
    }
}

customElements.define('frmdb-data-grid', DataGridComponent);
