# RDF Browser

To get started, install the WebExtension on your browser, e.g.:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Temporary_Installation_in_Firefox
https://developer.chrome.com/extensions/getstarted (not tested)

If the WebExtension was successfully installed, the following document should be rendered as a clickable HTML table:

https://schema.org/Thing.jsonld

For a general introduction to WebExtensions, see:

https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension

To build the project, run the following:

```sh
$ npm install -g browserify # if not already available
$ npm install
$ npm run browserify
```

Known issues:
 - no content negotiation yet (requests should be intercepted too)
 - when pages are fetched for the 2nd time, a cache is hit instead: the WebExtension script is never called
