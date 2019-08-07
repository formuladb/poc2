/**
* © 2018 S.C. FORMULA DATABASE S.R.L.
* License TBD
*/

const fetchMock = require('fetch-mock');

import { DbEditorComponent } from './db-editor.component';
import { FormulaEditorComponent } from '../formula-editor/formula-editor.component';
import { Schema_inventory } from '@test/mocks/mock-metadata';
import { InventoryVNavHtml } from '@fe/v-nav/v-nav.component.spec';
import { VNavComponent } from '@fe/v-nav/v-nav.component';

describe('DbEditorComponent', () => {
    beforeEach(() => {
        fetchMock.get('/formuladb-api/unknown-tenant/unknown-app/schema', Schema_inventory);
    });

    afterEach(fetchMock.restore)

    it('should navigate between tables', async (done) => { 
        document.body.innerHTML = '<frmdb-db-editor></frmdb-db-editor>';
        let el: DbEditorComponent = document.querySelector('frmdb-db-editor') as DbEditorComponent;
        expect(el instanceof DbEditorComponent).toEqual(true);

        await new Promise(resolve => setTimeout(resolve, 1500));
        let vnav: Element = el.querySelector('frmdb-v-nav')!;
        expect(vnav instanceof VNavComponent).toEqual(true);
        // expect(normalizeHTML(vnav.outerHTML)).toEqual(InventoryVNavHtml);

        // expect(normalizeHTML(el.shadowRoot!.innerHTML)).toEqual(normalizeHTML(/* html */`
        // <div class="formula-code-editor d-flex">
        //     <div style="margin: 5px 5px 0 5px;">
        //     <textarea class="editor-textarea" 
        //         disabled=""
        //         spellcheck="false"></textarea>
        //     <div class="editor-formatted-overlay" data-frmdb-value="html::ftext"></div>
        //     </div>
        // </div>
        // `));

        done();
    });

    it('should navigate between tables used in formula', async (done) => { 
        expect("TODO").toEqual("TODO");
        done();
    });

    it('should highlight table colums used in formula', async (done) => { 
        expect("TODO").toEqual("TODO");
        done();
    });
});