#!/usr/bin/env node

const _ = require('lodash');

const program = require('commander');
const pkg = require('../package.json');

program
    .option('--url <URL>', 'Base URL of Odoo instance. Default: [http://localhost:8069]', 'http://localhost:8069')
    .option('-d, --database <DATABASE>', 'Name of Odoo database to query.', 'odoo')
    .option('-u, --username <USERNAME>', 'Odoo username.')
    .option('-p, --password <PASSWORD>', 'Password for the given username.')
    .option('-o, --object <OBJECT>', 'Object to query; e.g., "res.partner".')
    .option('-q, --query <DOMAINS>', 'JSON-encoded list of Odoo domains to apply. If unspecified, all records are returned.', (val) => val.split(/\s*,+\s*/))
    .option('-f, --fields <FIELD1[,...]>', 'Comma-separated list of fields to return. If unspecified, all fields are returned.', (val) => val.split(/\s*,+\s*/))
    .version(pkg.version)
    .parse(process.argv);

if (typeof program.username === 'undefined') {
    console.error('No username specified.');
    program.help();
}

if (typeof program.object === 'undefined') {
    console.error('No object specified.');
    program.help();
}

const Promise = require('bluebird');
const xmlrpc = require('xmlrpc');
const url = require('url');

Promise.promisifyAll(require('xmlrpc/lib/client').prototype);

const config = _.pick(program, [ 'url', 'database', 'username', 'password', 'object', 'query', 'fields' ]);

const commonSvc = xmlrpc.createClient(url.resolve(config.url, 'xmlrpc/2/common'));
commonSvc.methodCallAsync('authenticate', [ config.db, config.username, config.password, { } ]).then((uid) => {
    const objectSvc = xmlrpc.createClient(url.resolve(config.url, 'xmlrpc/2/object'));
    const options = { };
    if (typeof program.fields !== 'undefined') {
        options.fields = program.fields;
    }

    let query = null;
    if (config.query) {
        try {
            query = JSON.parse(config.query);
        } catch(err) {
            console.error('Error parsing argument `query\': ' + err.message);
            program.help();
        }
    }

    const domains = query ? _.castArray(query) : [ ];

    return objectSvc.methodCallAsync('execute_kw', [ config.db, uid, config.password, config.object, 'search_read', [ domains ], options]).then((results) => {
        console.log(JSON.stringify(results));
    });
}).catch((err) => {
    console.error(err);
});
