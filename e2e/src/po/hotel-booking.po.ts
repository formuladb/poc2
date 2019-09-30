import {browser, element, by, ExpectedConditions, ElementArrayFinder, ElementFinder} from 'protractor';
import {Room, Booking} from '@test/hotel-booking/metadata';

export class HotelBooking {
 
  async navigateToHome() {
    await browser.get('formuladb-editor/editor.html#/formuladb-examples/hotel-booking/index.html');
  }

  /**
   * Get page title from iframe
   */
  async getPageTitle() {
    let EC = ExpectedConditions;

    // wait for iframe to be loaded
    await browser.wait(EC.presenceOf(element(by.css('iframe'))), 50000);
    await browser.switchTo().frame(0);
    // wait for the document inside the iframe to be loaded
    await browser.wait(EC.presenceOf(element(by.css('h2'))), 50000);
    return element(by.css('h2')).getText();
  }

  async getLogoIcon() {
    let EC = ExpectedConditions;

    // wait for iframe to be loaded
    await browser.wait(EC.presenceOf(element(by.css('iframe'))), 50000);
    await browser.switchTo().frame(0);
    // wait for the document inside the iframe to be loaded
    await browser.wait(EC.presenceOf(element(by.css('.navbar-brand.logo_h i'))), 50000);
    return element(by.css('.navbar-brand.logo_h i'));
  }

  /**
   * Get tables in left navigation bar
   */
  async getTablesDropdown() {
    // switch back to page content
    await browser.switchTo().defaultContent();
    let tablesDropDown: Array<ElementFinder> = await element.all(by.css('[data-frmdb-value="$frmdb.selectedTableId"]'));
    return tablesDropDown[0];
  }

  /**
   * Get pages in left navigation bar
   */
  async getPagesDropdown() {
    // switch back to page content
    await browser.switchTo().defaultContent();
    let pagesDropDown: Array<ElementFinder> = await element.all(by.css('[data-frmdb-value="$frmdb.selectedPageName"]'));
    return pagesDropDown[0];
  }

  async byCss(selector: string) {
    await browser.switchTo().defaultContent();
    return await element(by.css(selector));
  }  
  async allByCss(selector: string) {
    await browser.switchTo().defaultContent();
    return await element.all(by.css(selector));
  }

  async getTables() {
    // switch back to page content
    await browser.switchTo().defaultContent();
    let menuItems: Array<ElementFinder> = await element.all(by.css('[data-frmdb-value="$frmdb.tables[]._id"]'));
    
    let tables: Array<string> = [];
    // Using getAttribute('innerText') hack to get the link text, as explained here https://stackoverflow.com/questions/20888592/gettext-method-of-selenium-chrome-driver-sometimes-returns-an-empty-string
    for (var i = 0; i < menuItems.length; i++) {
      tables.push(await menuItems[i].getAttribute('innerText'));
    }

    return tables;
  }
  
  async getPages() {
    // switch back to page content
    await browser.switchTo().defaultContent();
    let menuItems: Array<ElementFinder> = await element.all(by.css('[data-frmdb-value="$frmdb.pages[].name"]'));
    
    let tables: Array<string> = [];
    // Using getAttribute('innerText') hack to get the link text, as explained here https://stackoverflow.com/questions/20888592/gettext-method-of-selenium-chrome-driver-sometimes-returns-an-empty-string
    for (var i = 0; i < menuItems.length; i++) {
      tables.push(await menuItems[i].getAttribute('innerText'));
    }

    return tables;
  }

  /**
   * Get first room type data from ag-grid table
   */
  async getFirstRoomTypeData() {
    // switch back to page content
    await browser.switchTo().defaultContent();

    // get header columns
    // document.querySelector('#data-grid > frmdb-data-grid').shadowRoot.querySelectorAll('#myGrid div.ag-header div.ag-header-cell span.ag-header-cell-text')
    // get first row columns
    // document.querySelector('#data-grid > frmdb-data-grid').shadowRoot.querySelectorAll('#myGrid div.ag-row[row-index="0"] div.ag-cell')
    // let firstRowCells: Array<any> = await element.all(by.js(() => {document.querySelector('#data-grid > frmdb-data-grid').shadowRoot.querySelectorAll('#myGrid div.ag-row[row-index="0"] div.ag-cell')}));
    let firstRowCells: Array<any> = [];
    
    let firstRoomData: { id: string, value: string }[] = [];
    for (var i = 0; i < firstRowCells.length; i++) {
      firstRoomData.push({
        id: await firstRowCells[i].getAttribute('col-id'),
        value: await firstRowCells[i].getText()
      });
    }

    return firstRoomData;
  }
}
