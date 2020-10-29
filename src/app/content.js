const browser = window.browser;
const interceptor = require("./interceptor");
const serializer = require("./serializer");
let triplestore;

async function init() {
    await loadContent();
    crawl();
}

async function loadContent() {
    const params = new URL(location.href).searchParams;
    const url = params.get("url");
    document.getElementById("title").innerText = url;
    const encoding = decodeURIComponent(params.get("encoding"));
    const format = decodeURIComponent(params.get("format"));
    try {
        triplestore = await interceptor.fetchDocument(url, encoding, format);
        document.getElementById("hint").remove();
        document.getElementById("status").remove();
        serializer.serializePrefixes(triplestore, document.getElementById("prefixes"));
        serializer.serializeTriples(triplestore, document.getElementById("triples"));
    } catch (e) {
        const sendUrl = browser.runtime.getURL("build/view/error.html?url=")
            + encodeURIComponent(url) + "&message=" + encodeURIComponent(e);
        window.location.replace(sendUrl);
    }
}

function crawl() {

}

module.exports = {init};
