const browser = window.browser;
const parser = require("./parser");
const serializer = require("./serializer");
const utils = require('./utils');
const scriptPath = "build/controller/style.js";
const templatePath = "build/view/template.html";
const filter = {
    urls: ["<all_urls>"]
};
let acceptHeader = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";
let options;

function getFormats() {
    const formats = [];
    if (options.json)
        formats.push("application/ld+json");
    if (options.n4)
        formats.push("application/n-quads");
    if (options.nt)
        formats.push("application/n-triples");
    if (options.xml)
        formats.push("application/rdf+xml");
    if (options.trig)
        formats.push("application/trig");
    if (options.ttl)
        formats.push("text/turtle");
    if (options.n3)
        formats.push("text/n3");
    return formats;
}

function getFileTypes() {
    const fileTypes = [];
    if (options.rdfext)
        fileTypes.push("rdf");
    if (options.jsonldext)
        fileTypes.push("jsonld");
    if (options.ttlext)
        fileTypes.push("ttl");
    if (options.ntext)
        fileTypes.push("nt");
    if (options.nqext)
        fileTypes.push("nq");
    return fileTypes;
}

function getFormatFor(fileType) {
    switch (fileType) {
        case "rdf":
            return "application/rdf+xml";
        case "jsonld":
            return "application/ld+json";
        case "ttl":
        case "nt":
        case "nq":
            return "text/turtle";
        default:
            return false;
    }
}

/**
 * Modify the accept header for all HTTP requests to include the content types specified in formats
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
    const url = new URL(details.url);
    if (utils.onList(options, "blacklist", url, true))
        return {};
    for (let headerField of details.requestHeaders) {
        if (headerField.name.toLowerCase() === "accept") {
            acceptHeader = getNewAcceptHeader(headerField.value);
            headerField.value = acceptHeader;
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
    if (details.statusCode >= 300 || details.type !== "main_frame" || utils.onList(options, "blacklist", new URL(details.url)))
        return {};
    const cl = details.responseHeaders.find(h => h.name.toLowerCase() === "content-length");
    if (cl) {
        const length = parseInt(cl.value);
        if (length === undefined || length > options.maxsize)
            return {};
    }
    const onWhitelist = utils.onList(options, "whitelist", new URL(details.url));
    const contentType = details.responseHeaders.find(h => h.name.toLowerCase() === "content-type");
    let format = contentType ? getFormats().find(f => contentType.value.includes(f)) : false;
    let fileType = new URL(details.url).pathname.split(".");
    fileType = (fileType !== undefined && fileType.length >= 1) ? fileType[fileType.length - 1] : false;
    let encoding = contentType ? contentType.value.split("charset=") : false;
    encoding = (encoding && encoding.length >= 2) ? encoding[1] : false;
    if (!format && !getFileTypes().includes(fileType) && !onWhitelist)
        return {};
    if (!format && !(format = getFormatFor(fileType))) {
        if (onWhitelist)
            console.warn(details.url +
                " is on the RDF Browser Whitelist, but the page content was not identified as RDF.");
        return {};
    }
    if (!encoding) {
        console.warn("The HTTP response does not include encoding information. Encoding in utf-8 is assumed.");
        encoding = "utf-8";
    }
    return rewriteResponse(cl, details, encoding, format);
}

/**
 * Rewrite the HTTP response (background script) or redirect to the html template (content script)
 */
function rewriteResponse(cl, details, encoding, format) {
    const responseHeaders = [
        {name: "Content-Type", value: "text/html; charset=utf-8"},
        {name: "Cache-Control", value: "no-cache, no-store, must-revalidate"},
        {name: "Content-Length", value: cl ? cl.value : "0"},
        {name: "Pragma", value: "no-cache"},
        {name: "Expires", value: "0"}
    ];
    if (options.contentScript) {
        return {
            responseHeaders: responseHeaders,
            redirectUrl: browser.runtime.getURL(templatePath
                + "?url=" + encodeURIComponent(details.url)
                + "&encoding=" + encodeURIComponent(encoding)
                + "&format=" + encodeURIComponent(format)
            )
        };
    }
    const filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder;
    try {
        decoder = new TextDecoder(encoding);
    } catch (e) {
        console.error("The RDF document is encoded in an unsupported format and can hence not be displayed.");
        return {};
    }
    const encoder = new TextEncoder();
    const baseIRI = details.url.toString();
    processRDFPayload(filter, decoder, format, baseIRI).then(output => {
        filter.write(encoder.encode(output));
    })
        .catch(e => {
            const output = "<h1>RDF-Browser: Error</h1><p>The RDF-document could not be displayed properly.<br>" +
                "The reason is displayed below:</p><p>" + e.toString() + "</p><br>" +
                "<p><i>Press Ctrl+U to view the page sources.</i></p>";
            filter.write(encoder.encode(output));
        })
        .finally(() => {
            filter.close();
        });
    return {
        responseHeaders: responseHeaders
    };
}

/**
 * Return the modified accept header as a string
 * @returns {string} The modified accept header
 */
function getNewAcceptHeader(oldHeader) {
    let newHeader = "";
    for (const f of getFormats())
        newHeader += f + ";q=1,";
    for (let f of oldHeader.split(",")) {
        let q = 1.0;
        let arr = f.split(";q=");
        if (arr.length > 1) {
            q = parseFloat(arr[1]);
            f = arr[0];
        }
        q -= .05;
        q = (q < 0 ? .0 : q);
        newHeader += f + ";q=" + q + ",";
    }
    newHeader = newHeader.substring(0, newHeader.length - 1);
    return newHeader;
}

/**
 * Fetch an RDF document as response to a content script request
 * @param port The port for communication with the content script
 * @param url The URI of the document to fetch
 * @param encoding The encoding of the document to fetch
 * @param format The format of the document to fetch
 */
function fetchDocument(port, url, encoding, format) {
    const request = new Request(url, {
        headers: new Headers({
            'Accept': acceptHeader
        })
    });
    fetch(request).then(response => response.body).then(response => {
        const baseIRI = new URL(location.href).searchParams.get("url");
        processRDFPayload(response.getReader(), new TextDecoder(encoding), format, baseIRI, port);
    });
}

/**
 * Parse the RDF payload and render it as HTML document using the serializer
 * @param stream The response stream
 * @param decoder The decoder for the response stream
 * @param format The serialization format of the RDF resource
 * @param baseIRI The IRI of the RDF document
 * @param port The port to communicate with the content script (null for background script mode)
 * @returns The HTML payload as string (in background script mode only)
 */
async function processRDFPayload(stream, decoder, format, baseIRI, port = null) {
    const contentScript = (port !== null);
    const triplestore = await parser.obtainTriplestore(stream, decoder, format, contentScript, baseIRI, port);
    if (contentScript) {
        serializer.serializePrefixes(triplestore, port);
        serializer.serializeTriples(triplestore, port);
    } else {
        let template = await getTemplate();
        template = await injectScript(template);
        return createDocument(template, triplestore);
    }

    function getTemplate() {
        return new Promise(resolve => {
            fetch(templatePath)
                .then(file => {
                    return file.text();
                })
                .then(text => {
                    resolve(text);
                })
        });
    }

    function injectScript(template) {
        return new Promise(resolve => {
            fetch(scriptPath)
                .then(file => {
                    return file.text();
                })
                .then(script => {
                    const array = template.split("//script");
                    resolve(array[0] + script + array[1]);
                })
        });
    }

    function createDocument(html, store) {
        const document = new DOMParser().parseFromString(html, "text/html");
        document.getElementById("title").innerText = baseIRI;
        document.getElementById("content-script").remove();
        document.getElementById("script").removeAttribute("src");
        document.getElementById("hint").remove();
        document.getElementById("status").remove();
        const scriptElement = document.getElementById("script");
        const scriptString = JSON.stringify(options.allStyleTemplate[options.allStyleTemplate.selected]);
        const script = "\nconst style = " + scriptString + ";\n";
        scriptElement.insertBefore(document.createTextNode(script), scriptElement.firstChild);
        document.getElementById("prefixes").appendChild(serializer.serializePrefixes(store));
        document.getElementById("triples").appendChild(serializer.serializeTriples(store));
        return new XMLSerializer().serializeToString(document);
    }
}

/**
 * Add the listeners for modifying HTTP request and response headers and for showing the page action button
 */
function addListeners() {
    browser.storage.onChanged.addListener(() => {
        utils.getOptions().then(res => options = res);
    });
    utils.getOptions().then(res => {
        options = res;
        browser.webRequest.onBeforeSendHeaders.addListener(modifyRequestHeader, filter, ["blocking", "requestHeaders"]);
        browser.webRequest.onHeadersReceived.addListener(modifyResponseHeader, filter, ["blocking", "responseHeaders"]);
        browser.webNavigation.onCommitted.addListener(details => {
            browser.pageAction.show(details.tabId);
        });
    })

}

module.exports = {addListeners, fetchDocument, acceptHeader}
