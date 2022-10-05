# RDF Browser
[![Build Status](https://travis-ci.com/kianschmalenbach/rdf-browser.svg?branch=master)](https://travis-ci.com/kianschmalenbach/rdf-browser)

RDF Browser is a Firefox Add-on that requests RDF files and renders RDF files as Turtle documents with clickable links.


| Current version: | 1.2.3       |
|------------------|-------------|
| Release date:    | Oct 5, 2022 |

The Add-on is released and maintained by the [Chair of Technical Information Systems](https://www.ti.rw.fau.de) at [Friedrich-Alexander-University Erlangen-Nürnberg](https://www.fau.de).

## Installation

### Installing from the Firefox Add-ons Website
The easiest way to add the Add-on to your Firefox browser is to install it directly from the Firefox Add-ons Website:

https://addons.mozilla.org/en-US/firefox/addon/rdf-browser

If the Add-on was successfully installed, documents such as the following should be rendered as a clickable Turtle document:

- https://www.w3.org/1999/02/22-rdf-syntax-ns
- http://dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl
- http://dbpedia.org/resource/Resource_Description_Framework

### Installing from Sources
To install the Add-on directly from sources, clone this repository, build the project (see below), and then follow the instructions on the following page:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox
<!--https://developer.chrome.com/extensions/getstarted (not tested)-->

#### Short Summary:
- Go to [about:debugging](about:debugging)
- Click *This Firefox*
- Click *Load Temporary Add-On*
- Select the *manifest.json* file from the Add-on directory

### Build
To build the project, run the following:

```sh
$ npm install
$ npm run build
```

## User Advice
- To customize the Add-on behavior and the output style, go to the options page at [about:addons](about:addons)
- To see the raw format of any rendered RDF file, click *Ctrl + U*.

## Changelog

### Version 1.2.3
- Fixed floating point numbers in HTTP accept header

### Version 1.2.2
- Minor bug fixes

### Version 1.2.1
- Improved consideration of 303 URIs
- Added support for different serializations in editor mode
- Added support for HTTP CRUD methods in editor mode

### Version 1.2.0
- New interactive editor mode
- Linked Data Principles conformance check
- Crawler functionality
- Usability improvements

### Version 1.1.7
- Added intelligent base prefix inclusion
- Fixed handling of relative URIs
- Improved error page

### Version 1.1.6
- Improved error handling
- Error reporting functionality

### Version 1.1.5
- Added quick actions menu
- Fixed cookie handling on URL redirect
- Added support for legacy content-type text/n3

### Version 1.1.4
- Support of Turtle inline blank node syntax
- Support of Turtle list syntax
- Performance improvement

### Version 1.1.3
- Restructured codebase
- Implemented CI pipeline
- Updated JSON-LD parser

### Version 1.1.2
- Fixed redirection problems
- Minor bug fixes

### Version 1.1.1
- Automatic handling of redirection responses
- Minor bug fixes

### Version 1.1.0
- Blacklist and whitelist support for URIs and domains
- Address bar button for convenient addition and removal of pages from blacklist and whitelist
- Option to display the Turtle output using [content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts)

### Version 1.0.4
- Minor bug fixes
- Improved error reporting

### Version 1.0.3
- Clickable blank nodes
- Consideration of file type in addition to content-type
- Improved syntax highlighting

### Version 1.0.2
- Syntax highlighting for Turtle output
- Options page to customize Add-on behavior and output style

### Version 1.0.1
- Bug fixes concerning blank node and prefix labeling
- Inclusion of popular prefixes in output
- Prevention of XHR interference and content-length limit (10 MB)
- Refactoring of triplestore for performance increase

## Credits
The Add-on uses the following libraries for parsing and serializing RDF files:
- [N3.js](https://www.npmjs.com/package/n3) (Turtle, TriG, Notation3, N-Triples, N-Quads)
- [jsonld-streaming-parser](https://www.npmjs.com/package/jsonld-streaming-parser) (JSON-LD)
- [jsonld-streaming-serializer](https://www.npmjs.com/package/jsonld-streaming-serializer) (JSON-LD)
- [rdfxml-streaming-parser](https://www.npmjs.com/package/rdfxml-streaming-parser) (RDF/XML)

This work was partially funded by the German Federal Ministry of Education and Research through the MOSAIK project (grant no. 01IS18070A).
