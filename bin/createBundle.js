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
    .usage('Usage: $0 -d <path> -a <authfile> -p <password>')
    .option('d', {
      alias: 'directory',
      describe: 'Input directory from which to read Open IGC bundle definition',
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
    .help('h')
    .alias('h', 'help')
    .wrap(yargs.terminalWidth())
    .argv;

// Base settings
const bundleDir = argv.directory;

const envCtx = new commons.EnvironmentContext();
if (argv.authfile !== undefined && argv.authfile !== "") {
  envCtx.authFile = argv.authfile;
} else {
  console.error("No authorisation file found -- cannot proceed.");
  process.exit(1);
}

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
  if (bh.validateBundle(true)) {
    bh.createBundleZip(function(err, pathToZip) {
      console.log("The bundle zip file is here: " + pathToZip);
      igcrest.createBundle(pathToZip, function(errCreate, resCreate) {
        if (errCreate !== null) {
          console.error("ERROR: Creating bundle failed -- " + errCreate);
        } else {
          console.log("Bundle successfully created: " + JSON.stringify(resCreate));
        }
      });
    });
  } else {
    process.exit(1);
  }

});
