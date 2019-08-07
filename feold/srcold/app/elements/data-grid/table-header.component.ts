import { Component, ViewChild, ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { FrmdbStreamsService } from '@fe/app/state/frmdb-streams.service';

@Component({
    selector: 'app-loading-overlay',
    templateUrl: 'table-header.component.html',
    styleUrls: ['table-header.component.scss']
})
export class TableHeaderComponent {
    public params: any;

    private ascSort: string;
    private descSort: string;
    private noSort: string;
    public devMode$: Observable<boolean>;

    constructor(protected frmdbStreams: FrmdbStreamsService) {
        this.devMode$ = frmdbStreams.devMode$;
    }

    @ViewChild('menuButton', { read: ElementRef }) public menuButton;

    agInit(params): void {
        this.params = params;

        params.column.addEventListener('sortChanged', this.onSortChanged.bind(this));
        this.onSortChanged();
    }

    onMenuClicked() {
        this.params.showColumnMenu(this.menuButton.nativeElement);
    };

    onFirstDataRendered(params) {
        params.api.autoSizeColumns();
    }

    selectColumn(colName: string) {
        this.frmdbStreams.userEvents$.next({ type: "UserSelectedCell", columnName: colName });
    }

    onSortChanged() {
        this.ascSort = this.descSort = this.noSort = 'inactive';
        if (this.params.column.isSortAscending()) {
            this.ascSort = 'active';
        } else if (this.params.column.isSortDescending()) {
            this.descSort = 'active';
        } else {
            this.noSort = 'active';
        }
    }

    onSortRequested(order, event) {
        this.params.setSort(order, event.shiftKey);
    }
}