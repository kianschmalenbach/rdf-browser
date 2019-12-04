const browser = window.browser || window.chrome;
const filter = {
    urls: ["<all_urls>"]
};
const commonPrefixSource = "https://prefix.cc/popular/all.file.json";
const commonPrefixes = [];
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
function modifyRequestHeader(details) {
    if (options.xhr && details.type !== "main_frame")
        return {};
    const formats = getFormats();
    if (formats.length === 0)
        return {};
    for (let header of details.requestHeaders) {
        if (header.name.toLowerCase() === "accept") {
            header.value = getNewHeader() + "," + header.value;
            break;
        }
    }
    return {requestHeaders: details.requestHeaders};
}

/**
 * Modify the header of an HTTP response if format of content-type matches any in formats
 * @param details The details of the HTTP response
 * @returns {{}|{responseHeaders: {name: string, value: string}[]}} The modified response header
 */
function modifyResponseHeader(details) {
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
    if (!encoding) {
        console.warn("The HTTP response does not include encoding information. Encoding in utf-8 is assumed.");
        encoding = "utf-8";
    }
    return {
        responseHeaders: [
            {name: "Content-Type", value: "text/html; charset=utf-8"},
            {name: "Cache-Control", value: "no-cache, no-store, must-revalidate"},
            {name: "Pragma", value: "no-cache"},
            {name: "Expires", value: "0"}
        ],
        redirectUrl: browser.runtime.getURL("src/template.html"
            + "?url=" + encodeURIComponent(details.url)
            + "&encoding=" + encodeURIComponent(encoding)
            + "&format=" + encodeURIComponent(format)
        )
    };
}

/**
 * Initialize the list of common prefixes, obtained from <commonPrefixSource>
 */
function initializeCommonPrefixes() {
    fetch(commonPrefixSource).then(response => {
        response.json().then(doc => {
            for (const prefix in doc)
                commonPrefixes.push([prefix, doc[prefix]]);
        })
    });
}

/**
 * Return the modified accept header as a string
 * @returns {string} The modified accept header
 */
function getNewHeader() {
    let newHeader = "";
    for (const f of getFormats())
        newHeader += f + ",";
    newHeader = newHeader.substring(0, newHeader.length - 1);
    newHeader += ";q=0.95";
    return newHeader;
}

/**
 * Initialize the list of common prefixes and add the listeners for modifying HTTP request and response headers
 */
initializeCommonPrefixes();
browser.webRequest.onBeforeSendHeaders.addListener(modifyRequestHeader, filter, ["blocking", "requestHeaders"]);
browser.webRequest.onHeadersReceived.addListener(modifyResponseHeader, filter, ["blocking", "responseHeaders"]);
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message) {
        case "acceptHeader":
            sendResponse(getNewHeader());
            break;
        case "commonPrefixes":
            sendResponse(commonPrefixes);
            break;
    }
});
browser.storage.onChanged.addListener(() => {
    browser.storage.sync.get("options").then(result => options = result.options);
});
browser.storage.sync.get("options").then(result => options = result.options);
