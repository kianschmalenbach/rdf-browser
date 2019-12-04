const browser = window.browser || window.chrome;
const filter = {
    urls: ["<all_urls>"]
};
let options = {};

function getFormats() {
    const formats = [];
    if (options.json)
        formats.push("application/ld+json");
    if (options.n4)
        formats.push("application/n-quads");
    if (options.n3)
        formats.push("application/n-triples");
    if (options.xml)
        formats.push("application/rdf+xml");
    if (options.trig)
        formats.push("application/trig");
    if (options.ttl)
        formats.push("text/turtle");
    return formats;
}

/**
 * Change the accept header for all HTTP requests to include the content types specified in formats
 * with higher priority than the remaining content types
 * @param details The details of the HTTP request
 * @returns {{requestHeaders: *}} The modified request header
 */
function changeHeader(details) {
    if (options.xhr && details.type !== "main_frame")
        return {};
    const formats = getFormats();
    if (formats.length === 0)
        return {};
    for (let header of details.requestHeaders) {
        if (header.name.toLowerCase() === "accept") {
            let newHeader = "";
            for (const f of formats)
                newHeader += f + ",";
            newHeader = newHeader.substring(0, newHeader.length - 1);
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
    if (details.statusCode !== 200 || details.type !== "main_frame")
        return {};
    const cl = details.responseHeaders.find(h => h.name.toLowerCase() === "content-length");
    if (cl) {
        const length = parseInt(cl.value);
        if (length !== undefined && length > options.maxsize)
            return {};
    }
    const ct = details.responseHeaders.find(h => h.name.toLowerCase() === "content-type");
    const format = ct ? getFormats().find(f => ct.value.includes(f)) : false;
    let encoding = ct ? ct.value.split("charset=") : false;
    if (!format || !encoding) {
        return {};
    }
    encoding = (encoding.length < 2 ? null : encoding[1]);
    const filter = browser.webRequest.filterResponseData(details.requestId);
    if (!encoding) {
        console.warn("The HTTP response does not include encoding information. Encoding in utf-8 is assumed.");
        encoding = "utf-8";
    }
    let decoder;
    try {
        decoder = new TextDecoder(encoding);
    } catch (e) {
        console.error("The RDF document is encoded in an unsupported format and can hence not be displayed.");
        return {};
    }
    const encoder = new TextEncoder("utf-8");
    renderer.render(filter, decoder, format).then(output => {
        filter.write(encoder.encode(output));
    })
        .catch(e => {
            const output = "<h1>RDF-Browser: Error</h1><p>The RDF-document could not be displayed properly.<br>" +
                "The reason is displayed below:</p><p>" + e.toString() + "</p>";
            filter.write(encoder.encode(output));
        })
        .finally(() => {
            filter.close();
        });
    return {
        responseHeaders: [
            {name: "Content-Type", value: "text/html; charset=utf-8"},
            {name: "Cache-Control", value: "no-cache, no-store, must-revalidate"},
            {name: "Pragma", value: "no-cache"},
            {name: "Expires", value: "0"}
        ]
    };
}

/**
 * Add the listeners for modifying HTTP request and response headers as well as the response payload
 */
browser.webRequest.onBeforeSendHeaders.addListener(changeHeader, filter, ["blocking", "requestHeaders"]);
browser.webRequest.onHeadersReceived.addListener(rewritePayload, filter, ["blocking", "responseHeaders"]);
browser.storage.onChanged.addListener(() => {
    browser.storage.sync.get("options").then(result => options = result.options);
});
browser.storage.sync.get("options").then(result => options = result.options);
