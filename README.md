# RDF Browser

## Getting Started
To get started, install the WebExtension on your browser, e.g.:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox
https://developer.chrome.com/extensions/getstarted (not tested)

### Short Manual for Firefox 67+:
  - Go to [about:debugging](about:debugging)
  - Click *This Firefox*
  - Click *Load Temporary Add-On*
  - Select the *manifest.json* file from this directory

If the WebExtension was successfully installed, the following document should be rendered as a clickable HTML table:

https://schema.org/Thing.jsonld

For a general introduction to WebExtensions, see:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension

### Building the Project
To build the project, run the following:

```sh
$ npm install -g browserify # if not already available
$ npm install
$ npm run browserify
```

## Known issues
  - When pages are fetched for the 2nd time, a cache is hit instead: the WebExtension script is never called.
