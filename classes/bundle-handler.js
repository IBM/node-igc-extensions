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

const xmldom = require('xmldom');
const xpath = require('xpath');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

/**
 * BundleHandler class -- for handling IGC Bundle definitions with the purpose of creating or updating asset type definitions
 * @example
 * // create an OpenIGC bundle with a new asset type definition
 * var igcext = require('ibm-igc-extensions');
 * var bh = new igcext.BundleHandler('.../ibm-igc-x-json');
 * bh.createBundleZip(function(err, pathToZip) {
 *   console.log("The bundle zip file is here: " + pathToZip);
 * });
 */
class BundleHandler {

  /**
   * Retrieves the flow XML, including any modifications that have been made (added assets)
   *
   * @constructor
   * @param {string} basePath - the base path of the bundle to create (i.e. directory containing 'asset_type_descriptor.xml')
   */
  constructor(basePath) {
    this._basePath = basePath;
    this._select = xpath.useNamespaces({"assettypedescriptor": "http://www.ibm.com/iis/igc/asset-type-descriptor"});
    this._descriptor = this._basePath + path.sep + "asset_type_descriptor.xml";
    const xml = fs.readFileSync(this._descriptor, { encoding: 'utf8' });
    this._doc = new xmldom.DOMParser().parseFromString(xml);
    const eDescriptor = this._getElement("/assettypedescriptor:descriptor");
    this._bundleId = eDescriptor.getAttribute("bundleId");
  }

  /**
   * @private
   */
  _getElementsByContext(expression, context) {
    return this._select(expression, context);
  }
  _getElementByContext(expression, context) {
    return this._getElementsByContext(expression, context)[0];
  }
  _getElements(expression) {
    return this._getElementsByContext(expression, this._doc);
  }
  _getElement(expression) {
    return this._getElements(expression)[0];
  }

  /**
   * Get the hostname for the REST connection
   * @return {string}
   */
  get bundleId() {
    return this._bundleId;
  }

  /**
   * Generates the default labels based on all of the default locale descriptions provided in the asset definition
   *
   * @function
   */
  generateLabels() {

    const labelsDir  = this._basePath + path.sep + "i18n" + path.sep;
    const labelsFile = labelsDir + "labels.properties";

    let labelsString = "";

    const aLabels = this._doc.getElementsByTagName("label");
    for (let i = 0; i < aLabels.length; i++) {
      const nLabel = aLabels[i];
      const labelKey  = nLabel.getAttribute("key");
      const labelDesc = nLabel.getAttribute("inDefaultLocale");
      labelsString += labelKey + "=" + labelDesc + "\n";
    }

    const aPlurals = this._doc.getElementsByTagName("pluralLabel");
    for (let i = 0; i < aPlurals.length; i++) {
      const nLabel = aPlurals[i];
      const labelKey  = nLabel.getAttribute("key");
      const labelDesc = nLabel.getAttribute("inDefaultLocale");
      labelsString += labelKey + "=" + labelDesc + "\n";
    }

    if (fs.existsSync(labelsFile)) {
      fs.renameSync(labelsFile, labelsDir + "labels.properties.backup");
    }
    fs.writeFileSync(labelsFile, labelsString, { encoding: 'utf8' });

  }

  /**
   * Does some basic validation of the bundle (e.g. ensuring all classes have icons and label translations)
   *
   * @function
   * @param {boolean} logIssues - if true, any issues identified are console.log'd
   * @returns {boolean} true if all checks pass, false otherwise
   */
  validateBundle(logIssues) {

    let valid = true;
    const hmClassToProperties = {};

    const aClasses = this._getElements("/assettypedescriptor:descriptor/assettypedescriptor:class");

    // Get a listing of all the class names (IDs) and all labels
    for (let i = 0; i < aClasses.length; i++) {
      const eClass = aClasses[i];
      const classId = eClass.getAttribute("localId");
      hmClassToProperties[classId] = {};
      const aLabels = eClass.getElementsByTagName("label");
      for (let j = 0; j < aLabels.length; j++) {
        const labelId = aLabels[j].getAttribute("key");
        hmClassToProperties[classId][labelId] = aLabels[j].getAttribute("inDefaultLocale");
      }
      const aPlurals = eClass.getElementsByTagName("pluralLabel");
      for (let j = 0; j < aPlurals.length; j++) {
        const pluralId = aPlurals[j].getAttribute("key");
        hmClassToProperties[classId][pluralId] = aPlurals[j].getAttribute("inDefaultLocale");
      }
    }

    const aIcons = fs.readdirSync(this._basePath + path.sep + "icons");
    const labelsString = fs.readFileSync(this._basePath + path.sep + "i18n" + path.sep + "labels.properties", { encoding: 'utf8' });

    const aClassNames = Object.keys(hmClassToProperties);
    for (let i = 0; i < aClassNames.length; i++) {
      const className = aClassNames[i];
      if (hmClassToProperties.hasOwnProperty(className)) {
        const bigIcon = className + "-bigIcon.gif";
        const smallIcon = className + "-icon.gif";
        // Check that a large and small icon exist for each of the classes
        if (aIcons.indexOf(bigIcon) < 0) {
          valid = false;
          if (logIssues) {
            console.log("Class '" + className + "' is missing its large icon: " + bigIcon);
          }
        }
        if (aIcons.indexOf(smallIcon) < 0) {
          valid = false;
          if (logIssues) {
            console.log("Class '" + className + "' is missing its small icon: " + smallIcon);
          }
        }
        // Check that a translation is defined for each of the properties
        const aClassProperties = Object.keys(hmClassToProperties[className]);
        for (let j = 0; j < aClassProperties.length; j++) {
          const classProperty = aClassProperties[j];
          if (hmClassToProperties[className].hasOwnProperty(classProperty)) {
            if (labelsString.indexOf(classProperty + "=") === -1) {
              valid = false;
              if (logIssues) {
                console.log("Class '" + className + "' is missing label for property: " + classProperty);
              }
            }
          }
        }
      }
    }

    return valid;

  }

  /**
   * Retrieves the flow XML, including any modifications that have been made (added assets)
   *
   * @function
   * @param {bundleCallback} callback - callback that is invoked once ZIP file is created
   */
  createBundleZip(callback) {

    let errCreate = null;

    const pathZip = this._basePath + path.sep + this._bundleId + "-bundle.zip";

    const output = fs.createWriteStream(pathZip);
    const archive = archiver('zip');
 
    // listen for all archive data to be written 
    output.on('close', function() {
      callback(errCreate, pathZip);
    });
 
    // good practice to catch this error explicitly 
    archive.on('error', function(err) {
      errCreate = err;
      callback(errCreate, pathZip);
    });

    // pipe archive data to the file 
    archive.pipe(output);

    // append bundle definition files
    archive.file(this._descriptor, { name: 'asset_type_descriptor.xml' });
    archive.directory(this._basePath + path.sep + 'i18n' + path.sep, 'i18n/');
    archive.directory(this._basePath + path.sep + 'icons' + path.sep, 'icons/');

    archive.finalize();

  }

  /**
   * This callback is invoked as the result of a bundle ZIP file being created, providing the path to the file.
   * @callback bundleCallback
   * @param {string} errorMessage - any error message, or null if no errors
   * @param {string} path - the file system path in which the ZIP file was created
   */

}

module.exports = BundleHandler;
