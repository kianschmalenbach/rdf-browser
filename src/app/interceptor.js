const browser = window.browser;
const parser = require("./parser");
const serializer = require("./serializer");
const utils = require('./utils');
const styleScriptPath = "build/controller/style.js";
const errorScriptPath = "build/controller/error.js";
const templatePath = "build/view/template.html";
const filter = {
    urls: ["<all_urls>"]
};
let acceptHeader = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8";
let options;
let quickOptions = {
    header: true,
    response: true,
    pageAction: true
}

function getQuickOptions() {
    return quickOptions;
}

function setQuickOptions(options) {
    quickOptions = options;
}

function getFormats(considerOptions = true) {
    const formats = [];
    if (!considerOptions || options.json)
        formats.push("application/ld+json");
    if (!considerOptions || options.n4)
        formats.push("application/n-quads");
    if (!considerOptions || options.nt)
        formats.push("application/n-triples");
    if (!considerOptions || options.xml)
        formats.push("application/rdf+xml");
    if (!considerOptions || options.trig)
        formats.push("application/trig");
    if (!considerOptions || options.ttl)
        formats.push("text/turtle");
    if (!considerOptions || options.n3)
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
    if (!quickOptions.header || (options.xhr && details.type !== "main_frame"))
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
    if (!quickOptions.response || details.statusCode >= 300 || details.type !== "main_frame" || utils.onList(options, "blacklist", new URL(details.url)))
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
        console.error("The RDF document is encoded in an unsupported format and can hence not be displayed:\n" + e);
        return {};
    }
    const encoder = new TextEncoder();
    const baseIRI = details.url.toString();
    processRDFPayload(filter, decoder, format, baseIRI).then(output => {
        filter.write(encoder.encode(output));
        filter.close();
    })
        .catch(e => {
            handleError(e).then(document => {
                filter.write(encoder.encode(document.toString()));
                filter.close();
            });
        });
    return {
        responseHeaders: responseHeaders
    };

    async function handleError(error) {
        const file = await fetch("build/view/error.html");
        let text = await file.text();
        text = await utils.injectScript(text, errorScriptPath);
        const document = new DOMParser().parseFromString(text.toString(), "text/html");
        document.title = baseIRI;
        document.getElementById("script").removeAttribute("src");
        const url = document.createTextNode(baseIRI);
        document.getElementById("url").setAttribute("href", baseIRI);
        document.getElementById("url").appendChild(url);
        const message = document.createTextNode(error.toString());
        document.getElementById("message").appendChild(message);
        return new XMLSerializer().serializeToString(document);
    }
}

/**
 * Return the modified accept header as a string
 * @returns {string} The modified accept header
 */
function getNewAcceptHeader(oldHeader, considerOptions = true) {
    let newHeader = "";
    for (const f of getFormats(considerOptions))
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
 * Fetch an RDF document as response to a content script request and return the triplestore
 * @param url The URI of the document to fetch
 * @param baseTriplestore The triplestore of the base document (if any)
 * @param encoding The encoding of the document to fetch
 * @param format The format of the document to fetch
 */
function fetchDocument(url, baseTriplestore, encoding = null, format = null) {
    const request = new Request(url, {
        headers: new Headers({
            'Accept': acceptHeader
        })
    });
    return new Promise((resolve, reject) => {
        fetch(request).then(response => {
            if (!response.ok)
                throw new Error(response.statusText);
            if (encoding === null)
                encoding = response.headers.get("Encoding") || "utf-8";
            if (format === null)
                format = (response.headers.get("Content-type").split(";"))[0];
            if (!getFormats(false).includes(format))
                throw new Error("Wrong format: " + format);
            return [encoding, format, response.body];
        }).then(answer => {
            const encoding = answer[0];
            const format = answer[1];
            const response = answer[2];
            if (baseTriplestore === null)
                parser.obtainTriplestore(response.getReader(), new TextDecoder(encoding), format, true, url)
                    .then(triplestore => resolve(triplestore))
                    .catch(reject);
            else
                parser.obtainDescriptions(response.getReader(), new TextDecoder(encoding), format, url, baseTriplestore)
                    .then(resolve)
                    .catch(reject);
        }).catch(reject);
    });
}

/**
 * Parse the RDF payload and render it as HTML document using the serializer
 * @param stream The response stream
 * @param decoder The decoder for the response stream
 * @param format The serialization format of the RDF resource
 * @param baseIRI The IRI of the RDF document
 * @returns The HTML payload as string (in background script mode only)
 */
async function processRDFPayload(stream, decoder, format, baseIRI) {
    const triplestore = await parser.obtainTriplestore(stream, decoder, format, false, baseIRI);
    let template = await getTemplate();
    template = await utils.injectScript(template, styleScriptPath);
    return createDocument(template, triplestore);

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

    function createDocument(html, store) {
        const document = new DOMParser().parseFromString(html, "text/html");
        document.getElementById("title").innerText = baseIRI;
        document.getElementById("content-script").remove();
        document.getElementById("script").removeAttribute("src");
        document.getElementById("header").remove();
        document.getElementById("aside").remove();
        document.getElementById("main").setAttribute("style",
            "position: static; height: 100%; margin: 0 auto;");
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
            if (quickOptions.pageAction)
                browser.pageAction.show(details.tabId);
        });
    })

}

module.exports = {addListeners, fetchDocument, acceptHeader, getNewAcceptHeader, getQuickOptions, setQuickOptions}
