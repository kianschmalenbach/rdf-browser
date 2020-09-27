# RDF Browser
[![Build Status](https://travis-ci.com/kianschmalenbach/rdf-browser.svg?branch=master)](https://travis-ci.com/kianschmalenbach/rdf-browser)

RDF Browser is a Firefox Add-on that requests RDF files and renders RDF files as Turtle documents with clickable links.


| Current version: | 1.1.4 |
| --- | --- |
| Release date: | Sep 27, 2020 |

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
The Add-on uses the following libraries for parsing the displayed RDF files:
- [@rdfjs/parser-n3](https://github.com/rdfjs-base/parser-n3) (N3)
- [jsonld-streaming-parser](https://github.com/rubensworks/jsonld-streaming-parser.js) (JSON-LD)
- [rdfxml-streaming-parser](https://github.com/rdfjs/rdfxml-streaming-parser.js) (RDF/XML)
