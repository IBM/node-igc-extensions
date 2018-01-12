#!/usr/bin/env node

/***
 * Copyright 2016 IBM Corp. All Rights Reserved.
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
 * @file Creates an Open IGC bundle from the contents of the provided directory
 * @license Apache-2.0
 * @requires ibm-igc-extensions
 * @requires ibm-iis-commons
 * @requires ibm-igc-rest
 * @requires prompt
 * @requires yargs
 * @example
 * // Creates an Open IGC bundle from the contents of .../ibm-igc-x-json (which should have 'asset_type_descriptor.xml' and 'i18n/', 'icons/' sub-directories)
 * ./createBundle.js -d .../ibm-igc-x-json
 */

const igcext = require('ibm-igc-extensions');
const commons = require('ibm-iis-commons');
const igcrest = require('ibm-igc-rest');
const prompt = require('prompt');
prompt.colors = false;

// Command-line setup
const yargs = require('yargs');
const argv = yargs
    .usage('Usage: $0 -d <path> -a <authfile> -p <password> -g')
    .example('$0 -d .../ibm-igc-x-json', 'create an OpenIGC asset definition from the contents of .../ibm-igc-x-json')
    .alias('d', 'directory').nargs('d', 1).describe('d', 'Input directory from which to read Open IGC bundle definition')
    .alias('a', 'authfile').nargs('a', 1).describe('a', 'Authorisation file containing environment context')
    .alias('p', 'password').nargs('p', 1).describe('p', 'Password for invoking REST API')
    .boolean('g').alias('g', 'generate').describe('g', 'Generate labels file')
    .boolean('c').alias('c', 'create').describe('c', 'Force creation')
    .boolean('u').alias('u', 'update').describe('u', 'Force update')
    .demandOption(['d'])
    .help('h')
    .alias('h', 'help')
    .wrap(yargs.terminalWidth())
    .argv;

// Base settings
const bundleDir = argv.directory;

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

prompt.start();
prompt.get(inputPrompt, function (errPrompt, result) {
  igcrest.setConnection(envCtx.getRestConnection(result.password));

  const bh = new igcext.BundleHandler(bundleDir);
  if (argv.generate) {
    bh.generateLabels();
  }
  if (bh.validateBundle(true)) {
    bh.createBundleZip(function(err, pathToZip) {
      console.log("The bundle zip file is here: " + pathToZip);

      if (argv.create) {
        create(pathToZip);
      } else if (argv.update) {
        update(pathToZip);
      } else {
        // Only look for whether bundle exists already if we are not forced into a
        // create or update by the command-line
        igcrest.getBundles().then(function(results) {
          if (results.indexOf(bh.bundleId) == -1) {
            create(pathToZip);
          } else {
            update(pathToZip);
          }
        });
      }
    });
  } else {
    process.exit(1);
  }

});

function create(pathToZip) {
  igcrest.createBundle(pathToZip).then(function(results) {
    console.log("Bundle successfully created: " + JSON.stringify(results));
  }, function(rejectReason) {
    console.error("ERROR: Creating bundle failed -- " + rejectReason);
  });
}

function update(pathToZip) {
  igcrest.updateBundle(pathToZip).then(function(results) {
    console.log("Bundle successfully updated: " + JSON.stringify(results));
  }, function(rejectReason) {
    console.error("ERROR: Updating bundle failed -- " + rejectReason);
  });
}
