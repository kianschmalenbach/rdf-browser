const browser = window.browser || window.chrome;
const formats = [
    "application/ld+json",
    "application/n-quads",
    "application/n-triples",
    "application/rdf+xml",
    "application/trig",
    "text/turtle"
];
const filter = {
    urls: ["<all_urls>"]
};
const maxSize = 10485760;
const commonPrefixSource = "https://prefix.cc/popular/all.file.json";
const commonPrefixes = [];

/**
 * Change the accept header for all HTTP requests to include the content types specified in formats
 * with higher priority than the remaining content types
 * @param details The details of the HTTP request
 * @returns {{requestHeaders: *}} The modified request header
 */
function modifyRequestHeader(details) {
    if(details.type !== "main_frame")
        return { };
    for(let header of details.requestHeaders) {
        if(header.name.toLowerCase() === "accept") {
            const newHeader = getNewHeader() + ",";
            header.value = newHeader + header.value;
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
    const cl = details.responseHeaders.find(h => h.name.toLowerCase() === "content-length");
    if(cl) {
        const length = parseInt(cl.value);
        if(length !== undefined && length > maxSize)
            return {};
    }
    const ct = details.responseHeaders.find(h => h.name.toLowerCase() === "content-type");
    const format = ct ? formats.find(f => ct.value.includes(f)) : false;
    let encoding = ct ? ct.value.split("charset=") : false;
    if(!format || !encoding) {
        return {};
    }
    encoding = (encoding.length < 2 ? null : encoding[1]);
    if(!encoding) {
        console.warn("The HTTP response does not include encoding information. Encoding in utf-8 is assumed.");
        encoding = "utf-8";
    }
    return {
        responseHeaders: [
            { name: "Content-Type", value: "text/html; charset=utf-8" },
            { name: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
            { name: "Pragma", value: "no-cache" },
            { name: "Expires", value: "0" }
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
            for(const prefix in doc)
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
    for(const f of formats)
        newHeader += f + ",";
    newHeader = newHeader.substring(0, newHeader.length-1) + ";q=0.95";
    return newHeader;
}


/**
 * Initialize the list of common prefixes and add the listeners for modifying HTTP request and response headers
 */
initializeCommonPrefixes();
browser.webRequest.onBeforeSendHeaders.addListener(modifyRequestHeader, filter, ["blocking", "requestHeaders"]);
browser.webRequest.onHeadersReceived.addListener(modifyResponseHeader, filter, ["blocking", "responseHeaders"]);
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message) {
        case "acceptHeader":
            sendResponse(getNewHeader());
            break;
        case "commonPrefixes":
            sendResponse(commonPrefixes);
            break;
    }
});
