# RDF Browser
RDF Browser is a Firefox Add-on that requests RDF files and renders RDF files as Turtle documents with clickable links.

| Current version: | 1.0.1 |
| --- | --- |
| Release date: | Oct 22, 2019 | 

## Installation

### Installing from the Firefox Add-ons Website
The easiest way to add the Add-on to your Firefox browser is to install it directly from the Firefox Add-ons Website:

https://addons.mozilla.org/en-US/firefox/addon/rdf-browser

If the Add-on was successfully installed, documents such as the following should be rendered as a clickable Turtle document:

- https://www.w3.org/1999/02/22-rdf-syntax-ns
- https://schema.org/Thing
- http://dbpedia.org/resource/Resource_Description_Framework

### Installing from Sources
To install the Add-on directly from sources, clone this repository and follow the instructions on the following page:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox
<!--https://developer.chrome.com/extensions/getstarted (not tested)-->

#### Short Summary:
- Go to [about:debugging](about:debugging)
- Click *This Firefox*
- Click *Load Temporary Add-On*
- Select the *manifest.json* file from the plugin directory

## User Advice
- To change the display style (monospace font vs. HTML-like view), select *Page Style* in the *View* menu 
- To see the raw format of any rendered RDF file, right click and select *View Page Sources*

## Build
To build the project, run the following:

```sh
$ npm install -g browserify # if not already available
$ npm install
$ npm run browserify
```

## Changelog

### Version 1.0.1
- Bug fixes concerning blank node and prefix labeling
- Inclusion of popular prefixes in output
- Prevention of XHR interference and content-length limit (10 MB)
- Refactoring of triplestore for performance increase

## Known issues
- The plugin does not make use of the browser cache for storing RDF files.
- The rendering does not stop when the browser is navigated to a different page.
