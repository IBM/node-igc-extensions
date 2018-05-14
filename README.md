# README

Objective of this module is to provide re-usable functionality and utilities for extending IBM Information Governance Catalog through OpenIGC: bundles, assets and custom attributes.

# Utilities

## upsertBundle.js

Creates (or updates an existing) OpenIGC bundle.  Usage:

```shell
node ./upsertBundle.js
	-d <path>
	[-g]
	[-c|-u]
	[-a <authfile>]
	[-p <password>]
```

Uses the bundle definition in the provided directory to create (or update existing) OpenIGC bundle in an IGC environment.  Details on the structuring of the directory can be found at <http://www.ibm.com/support/docview.wss?uid=swg21699130>  (The utility will create the required zip file for you, you simply need to ensure the underlying structure of directories and files matches what should be included in the zip file.)

The utility can also generate the labels file for you based on the labels you have provided in the bundle XML, if you pass the `-g` parameter.  You can also optionally force the utility to do a creation (`-c`) or an update (`-u`), if for some reason you do not want to use the utility's own logic for determining whether it should create or update the bundle.

By default (if not specified using the optional `-a` parameter), the utility will look for environment details in `~/.infosvrauth` and will prompt the user for a password.

The authorisation file can be generated using the <https://npmjs.com/package/ibm-iis-commons> module.  Refer to the `createInfoSvrAuthFile.js` utility there for more details.

##### Examples:

Given a directory structure under `/some/where/DataMass` that includes the file `asset_type_descriptor.xml`, the sub-directories `i18n` and `icons`, and `*-icon.gif` and `*-bigIcon.gif` files for each defined class in the `icons` sub-directory:

```shell
node ./upsertBundle.js
	-d /some/where/DataMass
	-g
```

will first generate the `i18n/labels.properties` file, then zip up the provided directory, and finally upload (creating the first time; updating any subsequent times) the DataMass asset type (bundle) into IGC.

## loadAssetInstances.js

Load IGC asset instances from an XML document.  Usage:

```shell
node ./loadAssetInstances.js
	-f <file>
	[-a <authfile>]
	[-p <password>]
```

Uses the definitions of asset instances in the provided XML file to create (or update existing) OpenIGC asset instances in an IGC environment.  Details on the formatting of the XML file can be found at <http://www.ibm.com/support/docview.wss?uid=swg21699130>

By default (if not specified using the optional `-a` parameter), the utility will look for environment details in `~/.infosvrauth` and will prompt the user for a password.

The authorisation file can be generated using the <https://npmjs.com/package/ibm-iis-commons> module.  Refer to the `createInfoSvrAuthFile.js` utility there for more details.

##### Examples:

Using this input file `asset_instances.xml`:

```xml
<doc xmlns="http://www.ibm.com/iis/flow-doc">
  <assets>
    <asset class="$DataMass-Project" repr="TestProj" ID="a1">
      <attribute name="name" value="TestProj"/>
      <attribute name="$phase" value="DEV"/>
    </asset>
    <asset class="$DataMass-Job" repr="AddressFormatter" ID="a2">
      <attribute name="$author" value="Homer"/>
      <attribute name="name" value="AddressFormatter"/>
      <attribute name="short_description" value="Formats client addresses."/>
      <attribute name="long_description" value="The form in which the addresses are stored in the source files does not fit..."/>
      <reference name="$Project" assetIDs="a1"/>
    </asset>
    <asset class="$DataMass-Stage_File" repr="Extractor" ID="a3">
      <attribute name="name" value="Extractor"/>
      <reference name="$Job" assetIDs="a2"/>
    </asset>
    <asset class="$DataMass-DataField" repr="fname" ID="a4">
      <attribute name="name" value="fname"/>
      <attribute name="$derivationExpression" value="trim(fname)"/>
      <reference name="$Stage" assetIDs="a3"/>
    </asset>
    <asset class="$DataMass-DataField" repr="lname" ID="a5">
      <attribute name="name" value="lname"/>
      <attribute name="$derivationExpression" value="trim(lname)"/>
      <reference name="$Stage" assetIDs="a3"/>
    </asset>
    <asset class="$DataMass-DataField" repr="city" ID="a6">
      <attribute name="name" value="city"/>
      <reference name="$Stage" assetIDs="a3"/>
    </asset>
    <asset class="$DataMass-Stage_Transformer" repr="Formatter" ID="a7">
      <attribute name="name" value="Formatter"/>
      <reference name="$Job" assetIDs="a2"/>
    </asset>
    <asset class="$DataMass-DataField" repr="fullname" ID="a8">
      <attribute name="name" value="fullname"/>
      <attribute name="$derivationExpression" value="fname + ' ' + lname"/>
      <reference name="$Stage" assetIDs="a7"/>
    </asset>
    <asset class="$DataMass-DataField" repr="city" ID="a9">
      <attribute name="name" value="city"/>
      <attribute name="$derivationExpression" value="upper(city)"/>
      <reference name="$Stage" assetIDs="a7"/>
    </asset>
    <asset class="$DataMass-Stage_File" repr="Writer" ID="a10">
      <attribute name="name" value="Writer"/>
      <reference name="$Job" assetIDs="a2"/>
    </asset>
    <asset class="$DataMass-DataField" repr="fullname" ID="a11">
      <attribute name="name" value="fullname"/>
      <attribute name="$derivationExpression" value="fullname"/>
      <reference name="$Stage" assetIDs="a10"/>
    </asset>
    <asset class="$DataMass-DataField" repr="city" ID="a12">
      <attribute name="name" value="city"/>
      <attribute name="$derivationExpression" value="city"/>
      <reference name="$Stage" assetIDs="a10"/>
    </asset>
  </assets>
  <importAction partialAssetIDs="a1" completeAssetIDs="a2"/>
</doc>
```

the following command will replace (overwrite) the details for the `AddressFormatter` job, including creating any of the stages within that job specified in the XML (because the job is included in `completeAssetIDs`); while ensuring the job is included in the `TestProj` project -- but without replacing any other contents of that project (because the project is included in `partionAssetIDs`):

```shell
node ./loadAssetInstances.js
	-f asset_instances.xml
```

## upsertCustomAttribute.js

Creates (or updates an existing) IGC Custom Attribute.  (Note that this is only available on v11.7+, as the API required was first introduced in that version.)  Usage:

```shell
node ./upsertCustomAttribute.js
	-f <file>
	[-c]
	[-a <authfile>]
	[-p <password>]
```

Uses the custom attribute definition in the provided JSON file to create (or update existing) IGC Custom Attribute in an IGC environment.  Examples of JSON definitions for custom attributes can be viewed through the REST API Explorer built into IGC.

The utility can also force creation of the custom attribute (`-c`), if for some reason you do not want to use the utility's own logic for determining whether it should create or update the bundle.

By default (if not specified using the optional `-a` parameter), the utility will look for environment details in `~/.infosvrauth` and will prompt the user for a password.

The authorisation file can be generated using the <https://npmjs.com/package/ibm-iis-commons> module.  Refer to the `createInfoSvrAuthFile.js` utility there for more details.

##### Examples:

Using this input file `MyCustomAttr.json`:

```json
{
   "name" : "relationCustomAttribute",
   "description" : "custom attribute description",
   "appliesTo" : [
      "term"
   ],
   "attributeType" : "Reference",
   "inverseName" : "reverseName",
   "targetReferences" : [
      "database_table",
   ],
   "multiValued" : true,
   "visibleInContainedObject" : true
}
```

the following command will create (first time; update subsequent times) a new relationship custom attribute called `relationCustomAttribute` between business terms and database tables:

```shell
node ./upsertCustomAttribute.js
	-f MyCustomAttr.json
```

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

## ibm-igc-extensions

Re-usable functions for extending IBM Information Governance Catalog (i.e. OpenIGC)

**Meta**

-   **license**: Apache-2.0

## AssetHandler

AssetHandler class -- for handling IGC Flow Documents (XML) with the purpose of creating or updating asset instances

**Examples**

```javascript
// create an XML flow document with a new asset instance
var igcext = require('ibm-igc-extensions');
var ah = new igcext.AssetHandler();
ah.addAsset('$MyBundle-ClassName', 'AssetInstanceName', '123', {
   "short_description": "This is a short description of my asset",
   "$newField": "This is the value for a field that only exists in this bundle (and class)"
});
```

### parseXML

Parses an XML flow document

**Parameters**

-   `xml` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### getAssetName

Gets the name of an asset

**Parameters**

-   `asset` **Asset** 

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### getAssetRID

Gets the RID of an asset

**Parameters**

-   `asset` **Asset** 

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### getAssetById

Gets an asset by its unique flow XML ID (not RID)

**Parameters**

-   `id` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

Returns **Asset** 

### getAssetNameById

Gets the name of an asset based on its unique flow XML ID (not RID)

**Parameters**

-   `id` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### getParentAssetId

Gets the ID of the parent (reference) of the provided asset

**Parameters**

-   `asset` **Asset** 

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### getTableIdentity

-   **See: module:ibm-igc-lineage~FlowHandler#getParentAssetId**

Gets the identity string (externalID) for the provided database table

**Parameters**

-   `tblName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the database table
-   `schemaId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the ID of the parent database schema

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### getColumnIdentity

-   **See: module:ibm-igc-lineage~FlowHandler#getParentAssetId**

Gets the identity string (externalID) for the provided database column

**Parameters**

-   `colName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the database column
-   `tableId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the ID of the parent database table

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### getColumnIdentityFromTableIdentity

-   **See: module:ibm-igc-lineage~FlowHandler#getTableIdentity**

Gets the database column identity string (externalID) from an existing database table identity string

**Parameters**

-   `colName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the database column
-   `tableIdentity` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the identity string (externalID) of the parent database table

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### addAsset

Adds an asset to the flow XML

**Parameters**

-   `className` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the classname of the data type of the asset (e.g. ASCLModel.DatabaseField)
-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the asset
-   `xmlId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the unique ID of the asset within the XML flow document
-   `objAttrs` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** the attributes to set on this asset
-   `parentType` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** the classname of the asset's parent data type (e.g. ASCLModel.DatabaseTable)
-   `parentId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** the unique ID of the asset's parent within the XML flow document

### addImportAction

Adds an import action to the flow XML (to actually create the assets)

**Parameters**

-   `completeAssetIDs` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)>** an array of asset IDs that should be created & replaced (if they already exist)
-   `partialAssetIDs` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)>?** an array of asset IDs that should be created if they do not exist; otherwise should be updated (i.e. children added)

### getCustomisedXML

-   **See: module:ibm-igc-extensions~AssetHandler#addAsset**

Retrieves the flow XML, including any modifications that have been made (added assets)

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the full XML of the flow document

## BundleHandler

BundleHandler class -- for handling IGC Bundle definitions with the purpose of creating or updating asset type definitions

**Parameters**

-   `basePath`  

**Examples**

```javascript
// create an OpenIGC bundle with a new asset type definition
var igcext = require('ibm-igc-extensions');
var bh = new igcext.BundleHandler('.../ibm-igc-x-json');
bh.createBundleZip(function(err, pathToZip) {
  console.log("The bundle zip file is here: " + pathToZip);
});
```

### constructor

Retrieves the flow XML, including any modifications that have been made (added assets)

**Parameters**

-   `basePath` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the base path of the bundle to create (i.e. directory containing 'asset_type_descriptor.xml')

### bundleId

Get the hostname for the REST connection

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### generateLabels

Generates the default labels based on all of the default locale descriptions provided in the asset definition

### validateBundle

Does some basic validation of the bundle (e.g. ensuring all classes have icons and label translations)

**Parameters**

-   `logIssues` **[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** if true, any issues identified are console.log'd

Returns **[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** true if all checks pass, false otherwise

### createBundleZip

Retrieves the flow XML, including any modifications that have been made (added assets)

**Parameters**

-   `callback` **[bundleCallback](#bundlecallback)** callback that is invoked once ZIP file is created

## bundleCallback

This callback is invoked as the result of a bundle ZIP file being created, providing the path to the file.

Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)

**Parameters**

-   `errorMessage` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** any error message, or null if no errors
-   `path` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the file system path in which the ZIP file was created
