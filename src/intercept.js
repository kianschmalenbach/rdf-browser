const browser = window.browser || window.chrome;
const filter = {
    urls: ["<all_urls>"]
};
const commonPrefixSource = "https://prefix.cc/popular/all.file.json";
const commonPrefixes = [];
const defaultOptions = {
    json: true,
    n4: true,
    n3: true,
    xml: true,
    trig: true,
    ttl: true,
    xhr: true,
    maxsize: 10485760,
    allStyleTemplate: {
        light: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#FFFFFF",
            fontFamily: "\"Consolas\", monospace, sans-serif",
            fontSize: 11,
            lineHeight: 1.1,
            color: "#000000",
            uri_color: "#2806C4",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#656465",
            prefixName_color: "#000000",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#656465",
            postfix_color: "#112DD3",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#656465",
            blankNode_color: "#656465",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#656465",
            literal_color: "#5200D0",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: true,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#656465"
        },
        dark: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#1E221D",
            fontFamily: "\"Consolas\", monospace, sans-serif",
            fontSize: 11,
            lineHeight: 1.1,
            color: "#FFFFFF",
            uri_color: "#D7F93B",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#9A9B9A",
            prefixName_color: "#FFFFFF",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#9A9B9A",
            postfix_color: "#EED22C",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#9A9B9A",
            blankNode_color: "#9A9B9A",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#9A9B9A",
            literal_color: "#ADFF2F",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: true,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#9A9B9A"
        },
        plain: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#FFFFF",
            fontFamily: "serif",
            fontSize: 12,
            lineHeight: 1.0,
            color: "#000000",
            uri_color: "#0000FF",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#0000FF",
            prefixName_color: "#0000FF",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#0000FF",
            postfix_color: "#0000FF",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#0000FF",
            blankNode_color: "#000000",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#000000",
            literal_color: "#000000",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: false,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#000000"
        },
        custom: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#FFFFFF",
            fontFamily: "\"Consolas\", monospace, sans-serif",
            fontSize: 11,
            lineHeight: 1.1,
            color: "#000000",
            uri_color: "#2806C4",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#656465",
            prefixName_color: "#000000",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#656465",
            postfix_color: "#112DD3",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#656465",
            blankNode_color: "#656465",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#656465",
            literal_color: "#5200D0",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: true,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#656465"
        },
        selected: "light"
    }
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
function addListeners() {
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
}

/**
 * Initialize the storage with the plugin default options and set the listener for option changes
 */
browser.storage.sync.set({
    defaultOptions: defaultOptions
}).then(() => {
    browser.storage.onChanged.addListener(() => {
        browser.storage.sync.get("options").then(result => options = result.options);
    });
    browser.storage.sync.get("options").then(result => {
        if (result.options === undefined) {
            result = {
                options: defaultOptions
            };
            browser.storage.sync.set(result);
        }
        options = result.options;
        addListeners();
    });
});
