const browser = window.browser;
const interceptor = require("./interceptor");
const serializer = require("./serializer");
const ts = require("../bdo/triplestore");
let triplestore;
let reqUri, uri, baseURI;

async function init() {
    const tabId = (await browser.tabs.getCurrent()).id;
    const requestDetails = await browser.runtime.sendMessage(["requestDetails", tabId.toString()]);
    reqUri = requestDetails.reqUrl;
    uri = requestDetails.url;
    await loadContent(requestDetails.encoding, requestDetails.format);
    await crawl(requestDetails.crawl);
}

async function loadContent(encoding, format) {
    document.getElementById("title").innerText = reqUri;
    document.getElementById("#navbar").setAttribute("value", uri);
    document.getElementById("#navbar").addEventListener("focusin", event => event.target.select());
    document.getElementById("#navbar").addEventListener("keypress", event => {
        if (event.key === "Enter")
            navigate();
    });
    document.getElementById("#navButton").addEventListener("click", navigate);
    const urlElement = document.createElement("a");
    baseURI = uri.split("#")[0];
    urlElement.setAttribute("href", baseURI);
    urlElement.appendChild(document.createTextNode(baseURI));
    document.getElementById("#uri").appendChild(urlElement);

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

async function crawl(crawlerEnabled) {
    if (typeof triplestore === "string")
        return;
    const stopButton = document.createElement("button");
    document.getElementById("status").parentElement.appendChild(stopButton);
    stopButton.innerText = "stop";
    stopButton.addEventListener("click", () => {
        stopButton.setAttribute("disabled", "disabled");
        crawlerEnabled = false;
    });
    let nonHttpCount = 0, rdfCount = 0, brokenCount = 0;
    let ldp4 = false;
    document.getElementById("status").innerText = "crawling documents";
    showDescription(null, uri.replace("https://", "http://"));
    const uris = [baseURI.split('#')[0]];
    for (const prefix of triplestore.prefixes) {
        if (prefix.used)
            addURI(prefix.value);
    }
    let baseUriContained = false, reqUriContained = false;
    for (const u in triplestore.uris) {
        if (u.replace("https://", "http://").split('#')[0] === baseURI.replace("https://", "http://").split('#')[0])
            baseUriContained = true;
        if (u.replace("https://", "http://").split('#')[0] === reqUri.replace("https://", "http://").split('#')[0])
            reqUriContained = true;
        addURI(triplestore.uris[u]);
    }
    let numberOfCrawls = 0;
    const crawls = [[]];
    const nonHttpUris = [];
    const hashLinks = document.querySelectorAll("a[href^=\'#\']");
    for (const link of hashLinks)
        markURI((baseURI.endsWith('#') ? baseURI : (baseURI + "#")) + link.getAttribute("href").substring(1), link, "color: #00A000;");
    for (const uri of uris) {
        if (!uri.startsWith("http")) {
            if (!nonHttpUris.includes(uri)) {
                nonHttpCount++;
                nonHttpUris.push(uri);
            }
            const links = document.querySelectorAll("a[href=\'" + uri + "\']");
            for (const link of links)
                link.setAttribute("style", "color: dimgray;");
            continue;
        }
        if (crawls[crawls.length - 1].length >= 3)
            crawls.push([]);
        crawls[crawls.length - 1].push(uri);
        numberOfCrawls++;
    }
    const allCount = baseUriContained ? numberOfCrawls : (numberOfCrawls - 1);
    if (allCount > 0)
        document.getElementById("#ldp1").setAttribute("class", "ldpFulfilled");
    else
        document.getElementById("#ldp1").setAttribute("class", "ldpNotFulfilled");
    if ((allCount - nonHttpCount) > 0)
        document.getElementById("#ldp2").setAttribute("class", "ldpFulfilled");
    else
        document.getElementById("#ldp2").setAttribute("class", "ldpNotFulfilled");
    if (reqUriContained)
        document.getElementById("#ldp3").setAttribute("class", "ldpFulfilled");
    else
        document.getElementById("#ldp3").setAttribute("class", "ldpNotFulfilled");
    document.getElementById("#links").innerText = allCount.toString();
    document.getElementById("#httplinks").innerText = (allCount - nonHttpCount).toString();
    document.getElementById("#rdflinks").innerText = rdfCount.toString();
    document.getElementById("#brokenlinks").innerText = brokenCount.toString();
    let crawlCount = 0;
    for (const crawl of crawls) {
        if (!crawlerEnabled)
            break;
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
        handleCrawlResults(uris.slice(0, 3), result, crawlCount);
        crawlCount += 3;
        if (!ldp4 && rdfCount > 1) {
            document.getElementById("#ldp4").setAttribute("class", "ldpFulfilled");
            ldp4 = true;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ldp4)
        document.getElementById("#ldp4").setAttribute("class", "ldpNotFulfilled");
    ts.removeUnusedPrefixes(triplestore);

    stopButton.remove();
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

    function handleCrawlResults(uris, results, count) {
        for (let i = 0; i < uris.length; ++i) {
            const links = document.querySelectorAll("a[href=\'" + uris[i] + "\']");
            let hashLinks = [];
            if (!uris[i].endsWith("#"))
                hashLinks = document.querySelectorAll("a[href^=\'" + uris[i] + "#\']");
            let style = "color: ";
            if (typeof results[i] === "object") {
                style += "#00A000;";
                if (count > 0) {
                    rdfCount++;
                    document.getElementById("#rdflinks").innerText = rdfCount.toString();
                }
            } else if (results[i] === "timeout")
                style += "dimgray;";
            else if (results[i] === "error" || (typeof results[i] === "number" && results[i] >= 400)) {
                style += "red;";
                if (count > 0) {
                    brokenCount++;
                    document.getElementById("#brokenlinks").innerText = brokenCount.toString();
                }
            }
            for (const link of links)
                markURI(uris[i], link, style);
            for (const link of hashLinks)
                markURI(link.getAttribute("href"), link, style);
            count++;
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

function navigate() {
    document.getElementById("#navButton").setAttribute("disabled", "disabled");
    let target = document.getElementById("#navbar").value;
    if (!target.startsWith("http"))
        target = "http://" + target;
    window.location.href = target;
}

module.exports = {init};
