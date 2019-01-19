/**
 * © 2017 S.C. CRYSTALKEY S.R.L.
 * License TBD
 */

import { KeyValueObj } from "./key_value_obj";
import { DataObj } from "./metadata/data_obj";
import { Entity } from "./metadata/entity";
import { Form } from "./uimetadata/form";
import { Table } from "./uimetadata/table";
import { generateUUID } from "./uuid";

/**
 * The events sent by the clients become transactions on the back-end
 */
export class MwzEvent implements KeyValueObj {
    _id: string;
    _rev?: string;
    clientId_: string;
    type_: string;
    state_: 'BEGIN' | 'PRECOMMIT' | 'COMMIT' | 'FINALIZED' | 'ABORT';
    reason_?: 'ABORTED_FAILED_VALIDATIONS_RETRIES_EXCEEDED' | 'ABORTED_CONFLICT_RETRIES_EXCEEDED' | 'ABORT_ON_ERROR';
    error_?: string;
    updatedIds_?: string[];
    notifMsg_?: string;

    constructor() {
        this.clientId_ = generateUUID();
        this.state_ = 'BEGIN';
    }
}

export const UserActionEditedFormDataN = "[form] UserActionEditedFormData";
export const UserActionEditedFormN = "[form] UserActionEditedForm";
export const UserActionEditedTableN = "[table] UserActionEditedTable";
export const UserActionEditedEntityN = "[entity] UserActionEditedEntity";
export const UserActionNewEntityN = "[entity] UserActionNewEntity";
export const UserActionDeleteEntityN = "[entity] UserActionDeleteEntity";

export class UserActionEditedFormDataEvent extends MwzEvent {
    readonly type_ = UserActionEditedFormDataN;

    constructor(public obj: DataObj) {
        super();
    }
}

export class UserActionEditedFormEvent extends MwzEvent {
    readonly type_ = UserActionEditedFormN;

    constructor(public form: Form) {
        super();
    }
}


export class UserActionEditedTableEvent extends MwzEvent {
    readonly type_ = UserActionEditedTableN;

    constructor(public table: Table) {
        super();
    }
}

export class UserActionEditedEntity extends MwzEvent {
    readonly type_ = UserActionEditedEntityN;

    constructor(public entity: Entity) {
        super();
    }
}

export class UserActionNewEntity extends MwzEvent {
    readonly type_ = UserActionNewEntityN;

    constructor(public path: string) {
        super();
    }
}

export class UserActionDeleteEntity extends MwzEvent {
    readonly type_ = UserActionDeleteEntityN;

    constructor(public entity: Entity) {
        super();
    }
}

export type MwzEvents = 
    | UserActionEditedFormDataEvent
    | UserActionEditedFormEvent
    | UserActionEditedTableEvent
    | UserActionEditedEntity
    | UserActionNewEntity
    | UserActionDeleteEntity
    ;
