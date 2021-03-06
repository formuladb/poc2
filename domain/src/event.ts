/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

import { KeyValueObj } from "./key_value_obj";
import { DataObj } from "./metadata/data_obj";
import { Entity, EntityProperty } from "./metadata/entity";
import { FullPageOpts, MandatoryPageOpts, AllPageOpts } from "./url-utils";
import { $PageObjT, $AppObjT } from "./metadata/default-metadata";
import { FailedValidation, FrmdbError } from "./errors";

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
    error_?: FrmdbError;
    updatedIds_?: string[];
    notifMsg_?: string;
    updatedObjs?: DataObj[];

    constructor() {
        this.state_ = 'BEGIN';
    }
}

export class ServerEventModifiedFormData extends MwzEvent {
    readonly type_ = "ServerEventModifiedFormData";

    constructor(public obj: DataObj) {
        super();
    }

    static fromPreComputeEvent(e: ServerEventPreComputeFormData): ServerEventModifiedFormData {
        let ret = new ServerEventModifiedFormData(e.obj);
        ret._id = e._id;
        ret.clientId_ = e.clientId_;
        return ret;
    }
}

export class ServerEventNewDataObj extends MwzEvent {
    readonly type_ = "ServerEventNewDataObj";

    constructor(public obj: DataObj) {
        super();
    }
}

export class ServerEventPreComputeFormData extends MwzEvent {
    readonly type_ = "ServerEventPreComputeFormData";

    constructor(public obj: DataObj) {
        super();
    }
}

export class ServerEventDeletedFormData extends MwzEvent {
    readonly type_ = "ServerEventDeletedFormData";

    constructor(public obj: DataObj) {
        super();
    }
}

export class ServerEventSetApp extends MwzEvent {
    readonly type_ = "ServerEventSetApp";

    constructor(
        public appName: string, 
        public app: $AppObjT, 
        public basedOnApp?: string) {
        super();
    }
}

export class ServerEventNewEntity extends MwzEvent {
    readonly type_ = "ServerEventNewEntity";

    constructor(public appName: string, public entityId: string) {
        super();
    }
}

export class ServerEventDeleteEntity extends MwzEvent {
    readonly type_ = "ServerEventDeleteEntity";

    constructor(public entityId: string) {
        super();
    }
}

export class ServerEventSetPage extends MwzEvent {
    readonly type_ = "ServerEventSetPage";

    constructor(public pageOpts: AllPageOpts, public pageObj: $PageObjT, 
        public startPageName: string | '$LANDING-PAGE$' | '$CONTENT-PAGE$') 
    {
        super();
    }
}

export class ServerEventDeletePage extends MwzEvent {
    readonly type_ = "ServerEventDeletePage";

    constructor(public pageName: string) {
        super();
    }
}

export class ServerEventPreviewFormula extends MwzEvent {
    readonly type_ = "ServerEventPreviewFormula";

    constructor(public targetEntity: Entity, public targetPropertyName: string, public currentDataObj: DataObj, public formula: string) {
        super();
    }
}

export class ServerEventSetProperty extends MwzEvent {
    readonly type_ = "ServerEventSetProperty";

    constructor(public targetEntity: Entity, public property: EntityProperty) {
        super();
    }
}

export class ServerEventPutPageHtml extends MwzEvent {
    readonly type_ = "ServerEventPutPageHtml";

    constructor(public pageOpts: AllPageOpts, public pageHtml: string, public specificPageOpts?: boolean) {
        super();
    }
}

export class ServerEventPutMediaObject extends MwzEvent {
    readonly type_ = "ServerEventPutMediaObject";

    constructor(public appName: string, public fileName: string, public base64Content: string) {
        super();
    }
}

export class ServerEventPutIcon extends MwzEvent {
    readonly type_ = "ServerEventPutIcon";
    savedIconClass?: string;

    constructor(public appName: string, public iconId: string) {
        super();
    }
}

export class ServerEventDeleteProperty extends MwzEvent {
    readonly type_ = "ServerEventDeleteProperty";

    constructor(public targetEntity: Entity, public propertyName: string) {
        super();
    }
}

export type MwzEvents = 
    | ServerEventModifiedFormData
    | ServerEventNewDataObj
    | ServerEventPreComputeFormData
    | ServerEventDeletedFormData
    | ServerEventNewEntity
    | ServerEventDeleteEntity
    | ServerEventPreviewFormula
    | ServerEventSetProperty
    | ServerEventDeleteProperty
    | ServerEventPutPageHtml
    | ServerEventPutMediaObject
    | ServerEventPutIcon
    | ServerEventSetPage
    | ServerEventDeletePage
    | ServerEventSetApp
    ;
