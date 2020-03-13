import { parsePageUrl, PageOpts } from "./url-utils";

describe('url-utils', () => {
    it('should parse page URL', () => {
        let ret = parsePageUrl('/en-basic-1a1a1a-ffffff-Clean/frmdb-apps/test-app/test-page.html');

        let expectedPageOpts: PageOpts = { 
            lang: 'en', 
            look: 'basic', 
            primaryColor: "1a1a1a", 
            secondaryColor: "ffffff", 
            theme: "Clean" ,
            tenantName: 'frmdb-apps',
            appName: 'test-app',
            pageName: 'test-page',
        };

        expect(ret).toEqual(expectedPageOpts);

    });
});
