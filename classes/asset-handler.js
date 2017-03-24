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

/**
 * AssetHandler class -- for handling IGC Flow Documents (XML) with the purpose of creating or updating asset instances
 * @example
 * // create an XML flow document with a new asset instance
 * var igcext = require('ibm-igc-extensions');
 * var ah = new igcext.AssetHandler();
 * 
 * ah.parseXML(xmlString);
 */
class AssetHandler {

  constructor() {
    this._xmlOriginal = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<doc xmlns=\"http://www.ibm.com/iis/flow-doc\">\n  <assets>\n  </assets>\n</doc>";
    this._doc = new xmldom.DOMParser().parseFromString(this._xmlOriginal);
    this._select = xpath.useNamespaces({"flowdoc": "http://www.ibm.com/iis/flow-doc"});
  }

  /**
   * Parses an XML flow document
   *
   * @function
   * @param {string} xml
   */
  parseXML(xml) {
    this._xmlOriginal = xml;
    this._doc = new xmldom.DOMParser().parseFromString(xml);
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
  getElements(expression) {
    return this._getElementsByContext(expression, this._doc);
  }
  getElement(expression) {
    return this.getElements(expression)[0];
  }

  /**
   * Gets the name of an asset
   *
   * @function
   * @param {Asset} asset
   * @returns {string}
   */
  getAssetName(asset) {
    return asset.getAttribute("repr");
  }

  /**
   * Gets the RID of an asset
   *
   * @function
   * @param {Asset} asset
   * @returns {string}
   */
  getAssetRID(asset) {
    return asset.getAttribute("externalID");
  }

  /**
   * @private
   */
  getAssetByClass(className) {
    return this.getElement("/flowdoc:doc/flowdoc:assets/flowdoc:asset[@class='" + className + "']");
  }

  /**
   * Gets an asset by its unique flow XML ID (not RID)
   *
   * @function
   * @param {string} id
   * @returns {Asset}
   */
  getAssetById(id) {
    return this.getElement("/flowdoc:doc/flowdoc:assets/flowdoc:asset[@ID='" + id + "']");
  }

  /**
   * Gets the name of an asset based on its unique flow XML ID (not RID)
   *
   * @function
   * @param {string} id
   * @returns {string}
   */
  getAssetNameById(id) {
    return this.getAssetName(this.getAssetById(id));
  }

  /**
   * Gets the ID of the parent (reference) of the provided asset
   *
   * @function
   * @param {Asset} asset
   * @returns {string}
   */
  getParentAssetId(asset) {
    return this._getElementByContext("flowdoc:reference", asset).getAttribute("assetIDs");
  }

  /**
   * Gets the identity string (externalID) for the provided database table
   *
   * @function
   * @see module:ibm-igc-lineage~FlowHandler#getParentAssetId
   * @param {string} tblName - the name of the database table
   * @param {string} schemaId - the ID of the parent database schema
   * @returns {string}
   */
  getTableIdentity(tblName, schemaId) {
    const eSchema = this.getAssetById(schemaId);
    const schemaName = this.getAssetName(eSchema);
    const dcnId = this.getParentAssetId(eSchema);
    const eDCN = this.getAssetById(dcnId);
    const dcnName = this.getAssetName(eDCN);
    const creationTool = this._getElementByContext("flowdoc:attribute[@name='creationTool']", eDCN).getAttribute("value");
    const hostId = this.getParentAssetId(eDCN);
    const eHost = this.getAssetById(hostId);
    const hostName = this.getAssetName(eHost);
    return "_ngo:table:" +
      "_ngo:db:" + hostName.toLowerCase() +
      "::" + dcnName.toLowerCase() +
      "::" + creationTool.toLowerCase() +
      "::" + schemaName.toLowerCase() +
      "::" + tblName.toLowerCase();
  }

  /**
   * Gets the identity string (externalID) for the provided database column
   *
   * @function
   * @see module:ibm-igc-lineage~FlowHandler#getParentAssetId
   * @param {string} colName - the name of the database column
   * @param {string} tableId - the ID of the parent database table
   * @returns {string}
   */
  getColumnIdentity(colName, tableId) {
    const eTable = this.getAssetById(tableId);
    const tableName = this.getAssetName(eTable);
    const schemaId = this.getParentAssetId(eTable);
    const tableIdentity = this.getTableIdentity(tableName, schemaId);
    return "_ngo:" +
      colName.toLowerCase() +
      tableIdentity.replace("_ngo:table:", "::");
  }

  /**
   * Gets the database column identity string (externalID) from an existing database table identity string
   *
   * @function
   * @see module:ibm-igc-lineage~FlowHandler#getTableIdentity
   * @param {string} colName - the name of the database column
   * @param {string} tableIdentity - the identity string (externalID) of the parent database table
   * @returns {string}
   */
  getColumnIdentityFromTableIdentity(colName, tableIdentity) {
    return "_ngo:" +
      colName.toLowerCase() +
      tableIdentity.replace("_ngo:table:", "::");
  }

  /**
   * Adds an asset to the flow XML
   *
   * @function
   * @param {string} className - the classname of the data type of the asset (e.g. ASCLModel.DatabaseField)
   * @param {string} name - the name of the asset
   * @param {string} xmlId - the unique ID of the asset within the XML flow document
   * @param {Object} objAttrs - the attributes to set on this asset
   * @param {string} [parentType] - the classname of the asset's parent data type (e.g. ASCLModel.DatabaseTable)
   * @param {string} [parentId] - the unique ID of the asset's parent within the XML flow document
   */
  addAsset(className, name, xmlId, objAttrs, parentType, parentId) {
    const eAsset = this._doc.createElement("asset");
    eAsset.setAttribute("class", className);
    eAsset.setAttribute("repr", name);
    eAsset.setAttribute("ID", xmlId);
    const eAttr = this._doc.createElement("attribute");
    eAttr.setAttribute("name", "name");
    eAttr.setAttribute("value", name);
    eAsset.appendChild(eAttr);
    const aAttrKeys = Object.keys(objAttrs);
    for (let j = 0; j < aAttrKeys.length; j++) {
      const key = aAttrKeys[j];
      if (objAttrs.hasOwnProperty(key) && key !== 'name') {
        const eAttr = this._doc.createElement("attribute");
        eAttr.setAttribute("name", key);
        eAttr.setAttribute("value", objAttrs[key]);
        eAsset.appendChild(eAttr);
      }
    }
    if (parentType) {
      const eRef = this._doc.createElement("reference");
      eRef.setAttribute("name", parentType);
      eRef.setAttribute("assetIDs", parentId);
      eAsset.appendChild(eRef);
    }
    this._doc.getElementsByTagName("assets").item(0).appendChild(eAsset);
  }

  /**
   * Adds an import action to the flow XML (to actually create the assets)
   *
   * @function
   * @param {string[]} completeAssetIDs - an array of asset IDs that should be created & replaced (if they already exist)
   * @param {string[]} [partialAssetIDs] - an array of asset IDs that should be created if they do not exist; otherwise should be updated (i.e. children added)
   */
  addImportAction(completeAssetIDs, partialAssetIDs) {
    const eImportAction = this._doc.createElement("importAction");
    eImportAction.setAttribute("completeAssetIDs", completeAssetIDs.join(' '));
    if (partialAssetIDs !== null && partialAssetIDs.length > 0) {
      eImportAction.setAttribute("partialAssetIDs", partialAssetIDs.join(' '));
    }
    this._doc.getElementsByTagName("doc").item(0).appendChild(eImportAction);
  }

  /**
   * Retrieves the flow XML, including any modifications that have been made (added assets)
   *
   * @function
   * @see module:ibm-igc-extensions~AssetHandler#addAsset
   * @returns {string} the full XML of the flow document
   */
  getCustomisedXML() {
    return new xmldom.XMLSerializer().serializeToString(this._doc);
  }

}

module.exports = AssetHandler;
