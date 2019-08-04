/**
* © 2018 S.C. FORMULA DATABASE S.R.L.
* License TBD
*/

const fetchMock = require('fetch-mock');

import { FormulaEditorComponent } from './formula-editor.component';
import { Schema_inventory } from '@test/mocks/mock-metadata';
import { normalizeHTML } from '@fe/live-dom-template/live-dom-template.spec';

describe('FormulaEditorComponent', () => {
    beforeEach(() => {
        fetchMock.get('/formuladb-api/unknown-app/schema', Schema_inventory);
    });

    afterEach(fetchMock.restore)

    it('should render', async (done) => { 
        document.body.innerHTML = '<frmdb-formula-editor></frmdb-formula-editor>';
        let el: FormulaEditorComponent = document.querySelector('frmdb-formula-editor') as FormulaEditorComponent;
        expect(el instanceof FormulaEditorComponent).toEqual(true);

        await new Promise(resolve => setTimeout(resolve, 200));
        console.log(el.shadowRoot!.innerHTML);
        expect(normalizeHTML(el.shadowRoot!.innerHTML)).toEqual(normalizeHTML(/* html */`
        <div class="formula-code-editor d-flex">
            <div style="margin: 5px 5px 0 5px;">
            <textarea class="editor-textarea" 
                disabled=""
                spellcheck="false"></textarea>
            <div class="editor-formatted-overlay" data-frmdb-value="html::ftext"></div>
            </div>
        </div>
        `));

        done();
    });
});
