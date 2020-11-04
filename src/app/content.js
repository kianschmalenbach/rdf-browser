const browser = window.browser;
const interceptor = require("./interceptor");
const serializer = require("./serializer");
const ts = require("../bdo/triplestore");
const rs = require("../bdo/resource");
let triplestore;
const crawled = [];

async function init() {
    await loadContent();
    await crawl();
}

async function loadContent() {
    const params = new URL(location.href).searchParams;
    const url = params.get("url");
    document.getElementById("title").innerText = url;
    const encoding = decodeURIComponent(params.get("encoding"));
    const format = decodeURIComponent(params.get("format"));
    try {
        triplestore = await interceptor.fetchDocument(url, null, encoding, format);
        document.getElementById("hint").remove();
        document.getElementById("status").remove();
        serializer.serializePrefixes(triplestore, document.getElementById("prefixes"));
        serializer.serializeTriples(triplestore, document.getElementById("triples"));
        crawled.push(url.split('#')[0]);
        document.querySelectorAll(".uri a,.postfix a").forEach(element => {
            element.addEventListener("mouseover", showDescription);
        });
    } catch (e) {
        const sendUrl = browser.runtime.getURL("build/view/error.html?url=")
            + encodeURIComponent(url) + "&message=" + encodeURIComponent(e);
        window.location.replace(sendUrl);
    }
}

async function crawl() {
    /* process triples in current document */
    for (const s in triplestore.subjects) {
        const subject = triplestore.subjects[s];
        for (const p in subject.predicates) {
            const predicate = subject.predicates[p];
            if (!predicate instanceof rs.URI || !ts.isAnnotationPredicate(predicate.value))
                continue;
            for (const o in predicate.objects)
                triplestore.uris[subject.value].annotate(predicate.value, predicate.objects[o]);
        }
    }
    /* crawl URIs from current document */
    for (const u in triplestore.uris) {
        const uri = triplestore.uris[u];
        const uriValue = uri.value.split('#')[0];
        if (crawled.includes(uriValue))
            continue;
        if (uri.isUsedAsPredicate()) {
            crawled.push(uriValue);
            interceptor.fetchDocument(uriValue, triplestore).catch(() => {
            });
        }
    }
}

function showDescription(event) {
    if (event.target.localName !== "a")
        return;
    const uri = triplestore.uris[event.target.getAttribute("href")];
    if (!uri)
        return;
    const description = uri.description;
    for (const type in description) {
        //TODO: show tooltip
        console.log(type);
        for (const value of description[type])
            console.log(value);
        console.log("\n");
    }
}

module.exports = {init};
