import { browser, element, by, ExpectedConditions, ElementArrayFinder, ElementFinder } from 'protractor';
import { E2eScenario } from "./e2e-scenario";
import { E2EApi } from "./e2e-api";
import { App } from "@domain/app";
import { Schema, Entity, Pn } from "@domain/metadata/entity";
import { DataObj } from "@domain/metadata/data_obj";
import { stepListOfTables } from './step-list-of-tables';

export interface AppIntroVideoScenarioData {
    app: App;
    schema: Schema;
    appData: DataObj[];
    homePageTitle: string;
}


export class AppIntroVideoScenario {

    constructor(public data: AppIntroVideoScenarioData, public SCEN: E2eScenario, public API: E2EApi) {

    }

    public mainEntities(): Entity[] {
        return Object.values(this.data.schema.entities)
            .filter(e => e._id.indexOf('$') < 0)
    }

    public mainTables(): string {
        return this.mainEntities().map(e => e._id)
            .join(',');
    }

    init() {
        this.SCEN.describe(this.data.app._id, () => {
            this.SCEN.step(`Welcome to ${this.data.app._id} application`, async () => {
                await this.API.navigateTo(`formuladb-editor/editor.html#/formuladb-apps/${this.data.app._id}/index.html`);
                await this.API.byCssInFrame('iframe#iframe1', 'h1,h2', this.data.homePageTitle);
            });

            stepListOfTables(this);

            this.SCEN.step(`Please follow our website for news about the official launch and more details like how to create Tables and Pages, perform data rollups with SUMIF/COUNTIF, define validations, import data from Spreadsheets and other systems, and much much more.`, async () => {
                await this.API.finish();
            });
        });
    }
}

