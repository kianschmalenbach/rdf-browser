const browser = window.browser;
const interceptor = require("./interceptor");
const serializer = require("./serializer");
const ts = require("../bdo/triplestore");
let triplestore;
let uri, baseURI;

async function init() {
    await loadContent();
    await crawl();
}

async function loadContent() {
    const params = new URL(location.href).searchParams;
    uri = params.get("url");
    document.getElementById("title").innerText = uri;
    document.getElementById("#navbar").setAttribute("value", uri);
    const urlElement = document.createElement("a");
    baseURI = uri.split("#")[0];
    urlElement.setAttribute("href", baseURI);
    urlElement.appendChild(document.createTextNode(baseURI));
    document.getElementById("#uri").appendChild(urlElement);
    const encoding = decodeURIComponent(params.get("encoding"));
    const format = decodeURIComponent(params.get("format"));

    try {
        triplestore = await interceptor.fetchDocument(uri, null, null, encoding, format);
        if (typeof triplestore === "string") {
            handleError(triplestore);
            return;
        }
        document.getElementById("status").innerText = "serializing triples...";
        serializer.serializePrefixes(triplestore, document.getElementById("prefixes"));
        serializer.serializeTriples(triplestore, document.getElementById("triples"));
        document.querySelectorAll(".uri a,.postfix a").forEach(element => {
            element.addEventListener("mouseover", showDescription);
        });
        const fragment = (uri.includes("#") ? uri.split("#")[1] : null);
        if (fragment !== null && fragment.length > 0)
            window.location.replace("#" + fragment);
        browser.webNavigation.onReferenceFragmentUpdated.addListener(details => {
            const val = details.url.split("#");
            if (val.length === 2)
                document.getElementById("#navbar").setAttribute("value", baseURI + '#' + val[1]);
            else
                document.getElementById("#navbar").setAttribute("value", baseURI);
        });
    } catch (e) {
        handleError(e);
    }

    function handleError(e) {
        const sendUrl = browser.runtime.getURL("build/view/error.html?url=")
            + encodeURIComponent(uri) + "&message=" + encodeURIComponent(e);
        window.location.replace(sendUrl);
    }
}

async function crawl() {
    if (typeof triplestore === "string")
        return;
    document.getElementById("status").innerText = "crawling documents";
    showDescription(null, uri.replace("https://", "http://"));
    const uris = [baseURI];
    for (const prefix of triplestore.prefixes)
        if (prefix.used)
            addURI(prefix.value);
    for (const u in triplestore.uris)
        addURI(triplestore.uris[u]);
    let numberOfCrawls = 0;
    const crawls = [[]];
    const hashLinks = document.querySelectorAll("a[href^=\'#\']");
    for (const link of hashLinks)
        markURI((baseURI.endsWith('#') ? baseURI : (baseURI + "#")) + link.getAttribute("href").substring(1), link, "color: #00A000;");
    for (const uri of uris) {
        if (!uri.startsWith("http")) {
            const links = document.querySelectorAll("a[href=\'" + uri + "\']");
            for (const link of links)
                link.setAttribute("style", "color: dimgray;");
            continue;
        }
        if (crawls[crawls.length - 1].length >= 5)
            crawls.push([]);
        crawls[crawls.length - 1].push(uri);
        numberOfCrawls++;
    }
    let pause = 250;
    let crawlCount = 0;
    for (const crawl of crawls) {
        const uris = [];
        const arr = [];
        for (const uri of crawl) {
            uris.push(uri);
            arr.push(new Promise(resolve => {
                interceptor.fetchDocument(uri, triplestore, triplestore).then(resolve);
            }));
        }
        document.getElementById("status").innerText = "crawling documents... (" + crawlCount + "/" + numberOfCrawls + ")";
        const result = await Promise.all(arr);
        crawlCount += 5;
        handleCrawlResults(uris.slice(0, 5), result);
        await new Promise(resolve => setTimeout(resolve, pause));
        if (pause < 2000)
            pause *= 2;
    }
    ts.removeUnusedPrefixes(triplestore);
    document.getElementById("status").innerText = "ready";

    function addURI(uri) {
        const uriValue = uri.value.split('#')[0];
        if (uris.includes(uriValue))
            return;
        uris.push(uriValue);
    }

    function markURI(uri, link, style) {
        if (link !== null)
            link.setAttribute("style", style);
        if (triplestore.uris.hasOwnProperty(uri)) {
            const tsUri = triplestore.uris[uri];
            if (tsUri.html === null)
                tsUri.createHtml();
            const href = tsUri.html.querySelector("a");
            if (href && !href.hasAttribute("style"))
                href.setAttribute("style", style);
        } else if (link !== null)
            markURI(uri.startsWith("https://") ? uri.replace("https://", "http://") : uri.replace("http://", "https://"), null, style);
    }

    function handleCrawlResults(uris, results) {
        for (let i = 0; i < uris.length; ++i) {
            const links = document.querySelectorAll("a[href=\'" + uris[i] + "\']");
            let hashLinks = [];
            if (!uris[i].endsWith("#"))
                hashLinks = document.querySelectorAll("a[href^=\'" + uris[i] + "#\']");
            let style = "color: ";
            if (typeof results[i] === "object")
                style += "#00A000;";
            else if (results[i] === "timeout")
                style += "dimgray;";
            else if (results[i] === "error" || (typeof results[i] === "number" && results[i] >= 400))
                style += "red;";
            for (const link of links)
                markURI(uris[i], link, style);
            for (const link of hashLinks)
                markURI(link.getAttribute("href"), link, style);
        }
    }
}

function showDescription(event, href = null) {
    if (event !== null) {
        const element = event.target;
        if (element.localName !== "a")
            return;
        href = element.getAttribute("href");
        if (href.startsWith('#'))
            href = (baseURI + href).replace("https://", "http://");
    }
    const uri = triplestore.uris[href];
    if (!uri)
        return;
    const refUri = document.getElementById("#ref-uri");
    while (refUri.firstElementChild)
        refUri.firstElementChild.remove();
    refUri.appendChild(uri.html);
    const refTriples = document.getElementById("#ref-triples");
    while (refTriples.firstElementChild)
        refTriples.firstElementChild.remove();
    serializer.serializeTriples(triplestore, refTriples, uri);
}

module.exports = {init};
