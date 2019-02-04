require('module-alias/register');
const fs = require('fs'),
    process = require('process');

import { getFrmdbEngine } from '@storage/key_value_store_impl_selector';
import { Schema } from '@core/domain/metadata/entity';

async function syncSchemaToKVS(schema: Schema) {
    let frmdbEngine = await getFrmdbEngine(schema);
    console.info("sync schema", Object.keys(schema.entities));
    return frmdbEngine.frmdbEngineStore.init();
}

console.log(process.argv[1]);
syncSchemaToKVS(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')));
