/**
 * © 2018 S.C. FORMULA DATABASE S.R.L.
 * License TBD
 */

require('source-map-support').install();
require('module-alias/register');

// Add this to the VERY top of the first file loaded in your app
var apm = require('elastic-apm-node').start({
    // Override service name from package.json
    serviceName: 'formuladb-be',
    // Use if APM Server requires a token
    //secretToken: '',
    serverUrl: process.env.ELASTICSEARCH_HOST,
    // for now send events for both dev and prod. Update in the future to disable dev
    active: true,
    environment: process.env.FRMDB_ENV_NAME || 'not-known',
    // captureBody: true,
    // transactionSampleRate: 1.0,
    verifyServerCert: false,//TODO: fix this
    logUncaughtExceptions: true,
})

import * as http from 'http';

//FIXME: use this only for dev/test environment
import { getKeyValueStoreFactory } from '@storage/key_value_store_impl_selector';
import { fixHtml } from './frmdb-cli/fix-html';
import { initTestDb } from './frmdb-cli/init-test-db';
import { autoUpgrade } from './frmdb-cli/auto-upgrade';

require('yargs')
    .scriptName("frmdb-be")
    .command(['start', '$0'], 'start http server', (yargs) => {
        yargs.option('port', {
            type: 'number',
            default: '3000',
            describe: 'the port to listen'
        })
    }, function (argv) {
        startServer(argv.port)
    })
    .command('init-db', 'initialize database from git lfs backup', {}, async (argv) => {
        try {
            let kvsFactory = await getKeyValueStoreFactory();
            await initTestDb(kvsFactory);
            console.log("finished db init");
        } catch (err) {
            console.error(err);
            throw err;
        }
    })
    .command('fix-html [files..]', 'fix html', {}, (argv) => {
        fixHtml(argv.files)
    })
    .help()
    .argv


async function startServer(port: number) {
    try {
        let kvsFactory = await getKeyValueStoreFactory();

        // if (process.env.FRMDB_LOCALDEV_ENV) {
        //     await kvsFactory.clearAllForTestingPurposes();
        //     await initTestDb(kvsFactory);
        // }

        // await autoUpgrade(kvsFactory);

        console.log('Init the server api');
        const app = await require('./config/express').default(kvsFactory);

        const server: http.Server = http.createServer(app);

        server.listen(port);

        server.on('error', (e: Error) => {
            console.log('Error starting server' + e);
        });

        server.on('listening', () => {
            console.log('Server started on port ' + port);
            startGitSync();
            startBackupDb();
        });
    } catch (ex) {
        console.error('error', ex); process.exit(1);
    }
}

function startGitSync() {
    console.log("Starting git-sync each 5 sec");
    setInterval(() => {
        runCmd('timeout', '30', 'bash', '/scripts/sync-git.sh');
    }, 30000)
}

function startBackupDb() {
    console.log("Starting backup-db every day");
    setInterval(() => {
        runCmd('timeout', '600', 'bash', '/scripts/backup-db.sh');
    }, 24 * 3600000)
}

var spawn = require('child_process').spawn;
function runCmd(cmd: string, ...args: string[]) {
    var prc = spawn(cmd, args);

    //noinspection JSUnresolvedFunction
    prc.stdout.setEncoding('utf8');
    prc.stdout.on('data', function (data) {
        var str = data.toString()
        var lines = str.split(/(\r?\n)/g);
        console.log(lines.join(""));
    });
    prc.stderr.on('data', function (data) {
        var str = data.toString()
        var lines = str.split(/(\r?\n)/g);
        console.error(lines.join(""));
    });

    prc.on('close', function (code) {
        if (code) console.error('process exit code ' + code);
    });
}

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
