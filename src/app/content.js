const browser = window.browser;
const interceptor = require("./interceptor");
const serializer = require("./serializer");
const parser = require("./parser");
const ts = require("../bdo/triplestore");
let triplestore, options;
let reqUri, uri, baseURI;
let editMode = false, crawlerEnabled;

async function init() {
    options = (await browser.storage.sync.get("options")).options;
    const tabId = (await browser.tabs.getCurrent()).id;
    const requestDetails = await browser.runtime.sendMessage(["requestDetails", tabId.toString()]);
    const params = new URL(location.href).searchParams;
    if (requestDetails === undefined) {
        reqUri = decodeURIComponent(params.get("url"));
        uri = reqUri;
    } else {
        reqUri = requestDetails.reqUrl ? requestDetails.reqUrl : decodeURIComponent(params.get("url"));
        uri = decodeURIComponent(params.get("url"));
    }
    crawlerEnabled = options.quickOptions.crawler;
    await loadContent(decodeURIComponent(params.get("encoding")), decodeURIComponent(params.get("format")));
    await crawl();
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
    document.getElementById("#editButton").addEventListener("click", handleEdit);
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
        document.getElementById("#editButton").removeAttribute("disabled");
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
    const stopButton = document.createElement("button");
    document.getElementById("status").parentElement.appendChild(stopButton);
    stopButton.setAttribute("id", "#stopButton");
    stopButton.innerText = "stop";
    stopButton.addEventListener("click", () => stopCrawler());
    document.getElementById("#editButton").addEventListener("click", () => stopCrawler());
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
        if (!crawlerEnabled)
            break;
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
            let style = "";
            if (typeof results[i] === "object") {
                style += "color: #00A000;";
                if (count > 0) {
                    rdfCount++;
                    document.getElementById("#rdflinks").innerText = rdfCount.toString();
                }
            } else if (results[i] === "timeout")
                style += "color: dimgray;";
            else if (results[i] === "error" || (typeof results[i] === "number" && results[i] >= 400)) {
                style += "color: red;";
                if (count > 0) {
                    brokenCount++;
                    document.getElementById("#brokenlinks").innerText = brokenCount.toString();
                }
            }
            for (const link of links)
                if (style !== "")
                    markURI(uris[i], link, style);
            for (const link of hashLinks)
                if (style !== "")
                    markURI(link.getAttribute("href"), link, style);
            count++;
        }
    }
}

async function stopCrawler() {
    if (!crawlerEnabled)
        return;
    const stopButton = document.getElementById("#stopButton");
    if (stopButton)
        stopButton.setAttribute("disabled", "disabled");
    crawlerEnabled = false;
    await new Promise(resolve => setTimeout(resolve, 500));
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

async function handleEdit() {
    const main = document.getElementById("main");
    const status = document.getElementById("status");
    const navbarLabel = document.getElementById("#navbarLabel");
    const uploadFormatLabel = document.getElementById("#uploadFormatLabel");
    const uploadFormat = document.getElementById("#uploadFormat");
    const uploadURILabel = document.getElementById("#uploadURILabel");
    const uploadURI = document.getElementById("#uploadURI");
    const elements = document.querySelectorAll("main *");
    const editButton = document.getElementById("#editButton");
    const editStyle = "color: black !important; text-decoration: none !important;"
    const backgroundStyle = "background-color: #d8ecf3 !important;"
    if (!editMode) {
        await stopCrawler();
        for (const element of elements)
            element.setAttribute("style", (element.getAttribute("style") || "") + editStyle);
        editButton.innerText = "Upload changes";
        navbarLabel.setAttribute("hidden", "hidden");
        //uploadFormatLabel.removeAttribute("hidden");
        uploadURILabel.removeAttribute("hidden");
        uploadURI.setAttribute("value", uri);
        main.setAttribute("contenteditable", "true");
        main.setAttribute("style", (main.getAttribute("style") || "") + backgroundStyle);
        main.addEventListener("input", handleInput);
        status.innerText = "document editable";
    } else {
        for (const element of elements)
            if (element.hasAttribute("style"))
                element.setAttribute("style", element.getAttribute("style").replace(editStyle, ""));
        main.removeAttribute("contenteditable");
        main.setAttribute("style", main.getAttribute("style").replace(backgroundStyle, ""));
        navbarLabel.removeAttribute("hidden");
        uploadFormatLabel.setAttribute("hidden", "hidden");
        uploadURILabel.setAttribute("hidden", "hidden");
        editButton.setAttribute("disabled", "disabled");
        status.removeAttribute("style");
        status.innerText = "uploading...";
        const success = await handleUpload();
        //if (success) {
        editButton.innerText = "Edit document";
        editButton.removeAttribute("disabled");
        status.innerText = "ready";
        window.location.replace(baseURI);
        //}
    }
    editMode = !editMode;

    function handleInput() {
        const turtleString = document.getElementById("main").innerText.toString();
        const status = document.getElementById("status");
        const error = parser.validateTurtle(turtleString, baseURI);
        if (!error) {
            status.setAttribute("style", "color: darkgreen;");
            status.innerText = "no syntax errors";
        } else {
            status.setAttribute("style", "color: darkred;");
            status.innerText = (error.toString().split("Error: "))[1];
        }
    }

    async function handleUpload() {
        const turtleString = document.getElementById("main").innerText.toString();
        const target = uploadURI.value;
        const format = uploadFormat.value;
        if (format !== "text/turtle") {
            alert("Uploading in format other than turtle not supported yet");
            return false;
        }
        try {
            const response = await fetch(target, {
                method: 'PUT',
                headers: {
                    'Content-Type': format
                },
                body: turtleString
            });
            if (response.status >= 400)
                throw new Error("Server responded: " + response.status + " " + response.statusText);
            return true;
        } catch (e) {
            alert("An error occurred when uploading the document.\n\n" + e.message);
            return false;
        }
    }
}

module.exports = {init};
