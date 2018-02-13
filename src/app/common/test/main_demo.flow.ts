import { ChangeObj } from "../domain/change_obj";

import * as meta from './mocks/mock-metadata';
import { MockData } from "./mocks/mock-data";

import { getDefaultTable } from "../domain.utils";
import { Entity } from '../domain/metadata/entity';

export var mockMetadata = new meta.MockMetadata();
export var mockData = new MockData(mockMetadata.entitiesMap)

let SYSTEMNAME = 'Cloudev'; //NEED IDEAS HERE!!! metawiz is not catchy enough, cloudev sounds better by there is a cloudevtech.com, let's open a poll

class Participant {
    msgTo(dst: Participant, payload: any) {
        return payload;
    }
}
class Actor extends Participant {}
class Box {
    participants: Participant[];
}

export const User = new Actor();
export const AppCmp   = new Participant(); 
export const NavCmp   = new Participant(); 
export const TableCmp = new Participant(); 
export const FormCmp  = new Participant(); 
export const AppEffects   = new Participant(); 
export const AppSt    = new Participant(); 
export const Express  = new Participant();

export const Client = {participants: [AppCmp, NavCmp, TableCmp, FormCmp, AppEffects, AppSt]} as Box;
export const Server = {participants: [Express]} as Box;

export const SIMPLE_FLOW = {
    comment1: `The 5 min overview of ${SYSTEMNAME}
        System running off existing metadata and data.
        Nothing really special, just standard looking ERP software`,
    When_user_first_accesses_the_app: {
        sequence: [
            User.msgTo(AppCmp, 'navigate /'),
            AppEffects.msgTo(Express, '/GET/mwz_api'),
            AppEffects.msgTo(AppSt, {nav: "the list of entities"})
        ]
    },
    Then_navigation_should_show_all_current_tables: {
    },
    And_default_table_page_with_service_forms_should_be_displayed: {
        serviceFormTable: getDefaultTable(meta.Forms__ServiceForm as Entity)
    },
    When_user_navigates_to_a_service_form: {},
    Then_the_form_page_should_be_displayed: {},
    When_user_updates_the_requested_quantity_of_a_product_list_item: {},
    Then_user_will_see_the_reserved_quantity_and_stock_computed_by_the_engine: {},
    TODO_user_creates_new_service_form: {},
};

export const METADATA_FLOW = {
    
    comment2: `What is special about ${SYSTEMNAME}: this standard looking ERP software is implemented using a simple language accesible to busines people`,
    TODO_use_editor_to_change_order_of_columns_in_table: {},
    TOOD_use_editor_to_change_form_layout: {},

    comment3: `So far only simple changes in the ui layout, let's see how easy it is to add new functionality to the system.
        We argue it is as simple as editing a Spreadsheet/Excel, anybody who has used Excel with a few formulas can use ${SYSTEMNAME}.`,
    TODO_create_Revision_Entity: {},
    TOOD_create_Revision_Form: {},
    TODO_create_and_edit_revisions: {},
};
