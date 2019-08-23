import { normalizeHTML } from "./fe-test-urils.spec";

describe('normalizeHtml', () => {
    beforeEach(() => {
    });
    
    it('should indent html correctly', () => {
        expect(normalizeHTML(/*html*/`<div>
            <a data-frmdb-table="asyncFunc[]" data-frmdb-value="asyncFunc[]"></a></div>
        `)).toEqual([
            '',
            '<div>',
            '    <a data-frmdb-table="asyncFunc[]" data-frmdb-value="asyncFunc[]"></a>',
            '</div>',
            ''
        ]);
    })
});
