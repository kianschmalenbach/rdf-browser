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
            if (!predicate instanceof rs.URI)
                continue;
            const annotationPredicate = ts.getAnnotationPredicate(predicate.value);
            if (!annotationPredicate)
                continue;
            for (const o in predicate.objects)
                triplestore.uris[subject.value].annotate(annotationPredicate, predicate.objects[o], triplestore);
        }
    }
    /* crawl URIs from current document */
    for (const u in triplestore.uris) {
        const uri = triplestore.uris[u];
        const uriValue = uri.value.split('#')[0];
        if (crawled.includes(uriValue))
            continue;
        crawled.push(uriValue);
        interceptor.fetchDocument(uriValue, triplestore).catch(() => {
        });
    }
    ts.removeUnusedPrefixes(triplestore);
}

function showDescription(event) {
    const element = event.target;
    if (element.localName !== "a")
        return;
    const uri = triplestore.uris[element.getAttribute("href")];
    if (!uri)
        return;
    let parent = element;
    while (!["subject", "predicate", "object"].includes(parent.getAttribute("class")))
        parent = parent.parentElement;
    const description = uri.description;
    if (Object.keys(description).length === 0)
        return;
    createTooltip(element, parent, description);

    function createTooltip(element, parent, description) {
        const tooltip = document.createElement("table");
        if (element.nextSibling)
            element.parentNode.insertBefore(tooltip, element.nextSibling);
        else
            element.parentNode.appendChild(tooltip);
        tooltip.setAttribute("class", "tooltip");
        const indent = parseInt(parent.getAttribute("indent"));
        if (indent > 0)
            tooltip.setAttribute("style", "margin-left: " + indent + "ch;");
        element.addEventListener("mouseout", () => tooltip.remove());
        fillTooltip(description, tooltip);
    }

    function fillTooltip(description, tooltip) {
        for (const type in description) {
            const tr = document.createElement("tr");
            tooltip.appendChild(tr);
            const th = document.createElement("th");
            tr.appendChild(th);
            th.appendChild(document.createTextNode(type));
            const td = document.createElement("td");
            tr.appendChild(td);
            for (const value of description[type]) {
                if (value.html === null)
                    value.createHtml();
                td.appendChild(value.html);
                td.appendChild(document.createElement("br"));
            }
        }
    }
}

module.exports = {init};
