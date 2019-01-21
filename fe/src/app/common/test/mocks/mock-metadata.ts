/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import * as _ from 'lodash';

import { Entity, Schema, Pn } from '../../domain/metadata/entity'

import * as InventoryMetadata from "./inventory-metadata";
import * as GeneralMetadata from "./general-metadata";
import * as FinancialMetadata from "./financial-metadata";
import * as FormsMetadata from "./forms-metadata";
import * as ReportsMetadata from "./reports-metadata";
import * as OrbicoMetadata from "./orbico-metadata";
import * as MusicBookingMetadata from "./musicbooking-metadata";

export * from "./inventory-metadata";
export * from "./general-metadata";
export * from "./forms-metadata";
export * from "./reports-metadata";
export * from "./financial-metadata";

export class MockMetadata {
    public schema: Schema = {_id: 'FRMDB_SCHEMA', entities: {}};
    public entities: Entity[] = [];

    public constructor() {
        this.entities.push(GeneralMetadata.General);
        this.entities.push(GeneralMetadata.GEN__Actor);
        this.entities.push(GeneralMetadata.GEN__Currency);
        this.entities.push(GeneralMetadata.GEN__Client);

        this.entities.push(InventoryMetadata.Inventory);
        this.entities.push(InventoryMetadata.INV__Order);
        this.entities.push(InventoryMetadata.INV__Order__Item);
        this.entities.push(InventoryMetadata.INV__Receipt);
        this.entities.push(InventoryMetadata.INV__Receipt__Item);
        this.entities.push(InventoryMetadata.INV__PRD);
        this.entities.push(InventoryMetadata.INV__PRD__Location);
        this.entities.push(InventoryMetadata.INV__PRD__Unit);
        
        this.entities.push(FinancialMetadata.Financial);
        this.entities.push(FinancialMetadata.FIN__Account);
        this.entities.push(FinancialMetadata.FIN__Transaction);

        this.entities.push(FormsMetadata.Forms);
        this.entities.push(FormsMetadata.Forms__ServiceForm);

        this.entities.push(ReportsMetadata.Reports);
        this.entities.push(ReportsMetadata.REP__DetailedCentralizerReport);
        this.entities.push(ReportsMetadata.REP__ServiceCentralizerReport);
        this.entities.push(ReportsMetadata.REP__LargeSales);
        this.entities.push(ReportsMetadata.REP__LargeSales__Product);

        this.entities.push(MusicBookingMetadata.MusicBooking);
        this.entities.push(MusicBookingMetadata.MBK__Service);
        this.entities.push(MusicBookingMetadata.MBK__Estimate);
        this.entities.push(MusicBookingMetadata.MBK__Estimate__Service);
        this.entities.push(MusicBookingMetadata.MBK__Session);
        this.entities.push(MusicBookingMetadata.MBK__Booking);
        this.entities.push(MusicBookingMetadata.MBK__Booking__Musician);
        this.entities.push(MusicBookingMetadata.MBK__Email);

        this.entities.forEach(ent => {
            ent.props._id = { name: "_id", propType_: Pn.STRING, allowNull: false };
            this.schema.entities[ent._id] = ent;
        });

        this.entities.forEach(ent => {
            // SchemaCompiler.applyInheritanceTo(ent, this.entitiesMap);
        });
    }
}
