# RDF Browser
RDF Browser is a Firefox AddOn that renders RDF files as Turtle documents with clickable links.

## Getting Started
To get started, install the WebExtension on your browser, e.g.:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox
<!--https://developer.chrome.com/extensions/getstarted (not tested)-->

### Short Manual for Firefox 67+:
  - Go to [about:debugging](about:debugging)
  - Click *This Firefox*
  - Click *Load Temporary Add-On*
  - Select the *manifest.json* file from the plugin directory

If the WebExtension was successfully installed, the following document should be rendered as a clickable Turtle document:

https://schema.org/Thing.jsonld

## Building the Project
To build the project, run the following:

```sh
$ npm install -g browserify # if not already available
$ npm install
$ npm run browserify
```

## Known issues
  - The view does not jump to the selected URI within a document
  - Not all elements of the Turtle syntax are currently supported
