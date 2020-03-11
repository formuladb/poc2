import { waitUntil } from "@domain/ts-utils";
import { DATA_BINDING_MONITOR } from "./init";
import { setupDataFrmdbInitDirective } from "./directives/data-frmdb-init";

export async function $UPDATEDOM(el: HTMLElement) {
    await waitUntil(() => DATA_BINDING_MONITOR);
    for (let tableEl of Array.from(el.querySelectorAll('[data-frmdb-table^="$FRMDB."]'))) {
        DATA_BINDING_MONITOR?.updateDOMForTable(tableEl as HTMLElement);
    }
    setupDataFrmdbInitDirective(el);
}
(window as any).$UPDATEDOM = $UPDATEDOM;
