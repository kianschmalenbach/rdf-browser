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
        document.getElementById("status").remove();
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
        const sendUrl = browser.runtime.getURL("build/view/error.html?url=")
            + encodeURIComponent(uri) + "&message=" + encodeURIComponent(e);
        window.location.replace(sendUrl);
    }
}

async function crawl() {
    showDescription(null, uri.replace("https://", "http://"));
    const uris = [baseURI];
    for (const u in triplestore.uris) {
        const uri = triplestore.uris[u];
        const uriValue = uri.value.split('#')[0];
        if (uris.includes(uriValue))
            continue;
        uris.push(uriValue);
    }
    const crawls = [[]];
    for (const uri of uris) {
        if (crawls[crawls.length - 1].length >= 5)
            crawls.push([]);
        crawls[crawls.length - 1].push(uri);
    }
    let pause = 250;
    for (const crawl of crawls) {
        const arr = [];
        for (const uri of crawl)
            arr.push(new Promise(resolve => resolve(interceptor.fetchDocument(uri, triplestore, triplestore))));
        await Promise.race([
            Promise.all(arr),
            new Promise(resolve =>
                setTimeout(() => resolve(), 2000)
            ).catch(() => {
            })
        ]);
        await new Promise(resolve => setTimeout(() => resolve(), pause));
        pause *= 2;
    }
    ts.removeUnusedPrefixes(triplestore);
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
