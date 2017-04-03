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
 * @file Load IGC asset instances from an XML flow document
 * @license Apache-2.0
 * @requires ibm-iis-commons
 * @requires ibm-igc-rest
 * @requires ibm-igc-extensions
 * @requires fs-extra
 * @requires pretty-data
 * @requires yargs
 * @requires prompt
 * @param f {string} - XML file from which to load IGC asset instances
 * @example
 * // loads IGC asset instances from the XML file provided (and default credentials file in ~/.infosvrauth)
 * ./loadAssetInstances.js -f assets.xml
 */

const commons = require('ibm-iis-commons');
const fs = require('fs-extra');
const pd = require('pretty-data').pd;
const igcrest = require('ibm-igc-rest');
const prompt = require('prompt');
prompt.colors = false;

// Command-line setup
const yargs = require('yargs');
const argv = yargs
    .usage('Usage: $0 -f <path> -a <authfile> -p <password>')
    .option('f', {
      alias: 'file',
      describe: 'XML flow document file',
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
const inputFile = argv.file;

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

  // Read in the XML file
  const xmlAssets = fs.readFileSync(inputFile, 'utf8');
  
  igcrest.createBundleAssets(pd.xmlmin(xmlAssets), function(errCreate, resCreate) {
    if (errCreate !== null) {
      console.error("ERROR: Creating assets failed -- " + errCreate);
    } else {
      console.log("Assets created: " + pd.json(JSON.stringify(resCreate)));
    }
  });

});
