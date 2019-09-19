const formats = [
    //'application/rdf+xml', /* currently no support */
    'application/ld+json',
    'text/turtle'
];
const filter = {
    urls: ["<all_urls>"]
};

/**
 * Change the accept header for all HTTP requests to include the content types specified in formats
 * with higher priority than the remaining content types
 * @param details The details of the HTTP request
 * @returns {{requestHeaders: *}} The modified request header
 */
function changeHeader(details) {
    for (let header of details.requestHeaders) {
        if (header.name.toLowerCase() === "accept") {
            let newHeader = "";
            for (const f of formats)
                 newHeader += f + ',';
            newHeader = newHeader.substring(0, newHeader.length-1);
            newHeader += ";q=0.95,";
            header.value = newHeader + header.value;
            break;
        }
    }
    return {requestHeaders: details.requestHeaders};
}

/**
 * Rewrite the payload of an HTTP response if format of content-type matches any in formats
 * @param details The details of the HTTP response
 * @returns {{}|{responseHeaders: {name: string, value: string}[]}} The modified response header
 */
function rewritePayload(details) {
    let ct = details.responseHeaders.find(h => h.name.toLowerCase() === 'content-type');
    let format = ct ? formats.find(f => ct.value.includes(f)) : false;

    if (format) {
        let filter = browser.webRequest.filterResponseData(details.requestId);
        let decoder = new TextDecoder("utf-8");
        let encoder = new TextEncoder();

        filter.ondata = event => {
            let str = decoder.decode(event.data, {stream: true});
            renderer.render(str, format)
              .then(html => {
                  filter.write(encoder.encode(html));
                  filter.close();
              });
        };

        return {
            responseHeaders: [
                { name: 'Content-Type', value: 'text/html' }
            ]
        };
    }

    return {};
}


/**
 * Add the listeners for modifying HTTP request and response headers as well as the response payload
 */
browser.webRequest.onBeforeSendHeaders.addListener(changeHeader, filter, ["blocking", "requestHeaders"]);
browser.webRequest.onHeadersReceived.addListener(rewritePayload, filter, ["blocking", "responseHeaders"]);
