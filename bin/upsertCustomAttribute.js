#!/usr/bin/env node

/***
 * Copyright 2018 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * @file Creates an IGC Custom Attribute from the contents of the provided JSON file
 * @license Apache-2.0
 * @requires ibm-igc-extensions
 * @requires ibm-iis-commons
 * @requires ibm-igc-rest
 * @requires prompt
 * @requires yargs
 * @example
 * // Creates an IGC Custom Attribute from the contents of .../MyCustomAttr.json
 * ./upsertCustomAttribute.js -f .../MyCustomAttr.json
 */

const igcext = require('ibm-igc-extensions');
const commons = require('ibm-iis-commons');
const igcrest = require('ibm-igc-rest');
const _ = require('underscore');
const fs = require('fs');
const prompt = require('prompt');
prompt.colors = false;

// Command-line setup
const yargs = require('yargs');
const argv = yargs
    .usage('Usage: $0 -f <path> -a <authfile> -p <password>')
    .option('f', {
      alias: 'file',
      describe: 'Input file (JSON) from which to read IGC Custom Attribute definition',
      demand: true, requiresArg: true, type: 'string'
    })
    .option('a', {
      alias: 'authfile',
      describe: 'Authorisation file containing environment context',
      requiresArg: true, type: 'string'
    })
    .option('p', {
      alias: 'password',
      describe: 'Password for invoking REST API',
      demand: false, requiresArg: true, type: 'string'
    })
    .option('c', {
      alias: 'create',
      describe: 'Force creation',
      demand: false, requiresArg: false, type: 'boolean'
    })
    .help('h')
    .alias('h', 'help')
    .wrap(yargs.terminalWidth())
    .argv;

// Base settings
const envCtx = new commons.EnvironmentContext(null, argv.authfile);
prompt.override = argv;

const inputPrompt = {
  properties: {
    password: {
      hidden: true,
      required: true,
      message: "Please enter the password for user '" + envCtx.username + "': "
    }
  }
};
prompt.message = "";
prompt.delimiter = "";

const nonEditableAttributes = [
  "attributeType",
  "visibleInContainedObject",
  "multiValued"
];

prompt.start();
prompt.get(inputPrompt, function (errPrompt, result) {
  igcrest.setConnection(envCtx.getRestConnection(result.password));

  const defn = JSON.parse(fs.readFileSync(argv.file, 'utf8'));

  if (argv.create) {
    create(defn);
  } else {
    // Only look for whether custom attribute exists already if we are not forced into a
    // create or update by the command-line
    igcrest.getCustomAttributes(1000).then(function(results) {
      if (results.items.length > 0) {
        const criteria = {
          name: defn.name
        };
        const existingCA = _.findWhere(results.items, criteria);
        if (typeof existingCA === 'undefined' || existingCA === null) {
          create(defn);
        } else {
          // See if there is any overlap in the "appliesTo" of the two definitions,
          const unionedAppliesTo = _.union(defn.appliesTo, existingCA.appliesTo);
          if (unionedAppliesTo.length !== (defn.appliesTo.length + existingCA.appliesTo.length)) {
            // and if so it's an update;
            // ... but first we need to make sure we're not trying to change something that 
            // cannot be changed -- to do so we'll need the full custom attribute definition
            let conflictingUpdate = false;
            igcrest.getOther("/ibm/iis/igc-rest/v1/administration/attributes/" + existingCA.id, 200).then(function(fullExistingCA) {
              for (let i = 0; i < nonEditableAttributes.length; i++) {
                const nonEditableAttr = nonEditableAttributes[i];
                if (fullExistingCA[nonEditableAttr] !== defn[nonEditableAttr]) {
                  conflictingUpdate = true;
                  console.error("ERROR: Conflicting update.  New definition specifies different '" + nonEditableAttr + "' from existing definition ('" + defn[nonEditableAttr] + "' vs '" + fullExistingCA[nonEditableAttr] + "').");
                } else {
                  delete defn[nonEditableAttr];
                }
              }
              if (!conflictingUpdate) {
                update(existingCA.id, defn);
              }
            });
          } else {
            // otherwise it's a create
            create(defn);
          }
        }
      }
    });
  }

});

function create(defn) {
  igcrest.createCustomAttribute(defn).then(function(results) {
    console.log("Custom attribute successfully created: " + JSON.stringify(results));
  }, function(rejectReason) {
    console.error("ERROR: Creating custom attribute failed -- " + rejectReason);
  });
}

function update(rid, defn) {
  igcrest.updateCustomAttribute(rid, defn).then(function(results) {
    console.log("Custom attribute successfully updated: " + JSON.stringify(results));
  }, function(rejectReason) {
    console.error("ERROR: Updating custom attribute failed -- " + rejectReason);
  });
}
