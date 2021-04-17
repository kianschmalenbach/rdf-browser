const browser = window.browser;
const interceptor = require('./app/interceptor');
const ts = require('./bdo/triplestore');
const utils = require('./app/utils');
const content = require('./app/content.js');
const defaultOptions = {
    json: true,
    n4: true,
    nt: true,
    xml: true,
    trig: true,
    ttl: true,
    n3: true,
    xhr: true,
    rdfext: false,
    jsonldext: false,
    ttlext: false,
    ntext: false,
    nqext: false,
    contentScript: false,
    maxsize: 10485760,
    allStyleTemplate: {
        none: {
            whiteSpace_nowrap: true,
            prefixes_marginBottom: "0em",
            width: "100%"
        },
        light: {
            width: "100%",
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
            width: "100%",
            aside_backgroundColor: "#111111",
            aside_color: "white",
            header_backgroundColor: "#AAAAAA",
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
        custom: {
            width: "100%",
            aside_backgroundColor: "#EEEEEE",
            aside_color: "black",
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
    },
    blacklist: "",
    whitelist: "",
    quickOptions: {
        header: true,
        response: true,
        crawler: true,
        pageAction: true
    },
    acceptLanguage: "en;q=0.9, de;q=0.8, *;q=0.5",
    evaluationURI: "http://localhost:3000"
};
let options;

/**
 * Initialize the listeners for messages from content scripts
 */
function initMessageListeners() {
    interceptor.addListeners();
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        let msg = Array.isArray(message) ? message[0] : message;
        switch (msg) {
            case "acceptHeader":
                sendResponse(interceptor.acceptHeader);
                break;
            case "defaultOptions":
                sendResponse(defaultOptions);
                break;
            case "evaluation":
                const serverURI = message[1];
                evaluateConformance(serverURI).then(() => evaluatePerformance(serverURI).then());
                break;
            case "listStatus":
                sendResponse(utils.getListStatus(options, message[1], message[2]));
                break;
            case "requestDetails":
                sendResponse(interceptor.getRequestDetails(message[1]));
                break;
        }
    });
}

/**
 * Evaluate the performance of RDF Browser
 * @param serverURI The URI of the server providing the evaluation files
 */
async function evaluatePerformance(serverURI) {
    return new Promise(async function (resolve) {
        const times = [];
        let n = 1;
        let i = 0;
        let flag = false;
        let html = true;

        interceptor.setPerformanceEvaluation(true);
        let tab = await browser.tabs.create({});
        browser.tabs.onUpdated.addListener(listener);
        iterate();

        async function listener(tabId, changeInfo) {
            if (tabId !== tab.id || !changeInfo.hasOwnProperty("status"))
                return;

            const time = html ? "ttlTime" : "htmlTime";
            if (!flag && changeInfo.status === "loading" && changeInfo.hasOwnProperty("url") &&
                (changeInfo.url.endsWith(i + ".html") || changeInfo.url.endsWith(i + ".ttl"))) {
                if (html)
                    times[i - 1].uri = changeInfo.url.substring(0, changeInfo.url.length - 4);
                times[i - 1].start = -Date.now();
                flag = true;
            } else if (flag && changeInfo.status === "complete") {
                const currentTime = times[i - 1].start + Date.now();
                delete times[i - 1].start;
                const prevTime = (n === 1) ? 0 : times[i - 1][time];
                times[i - 1][time] = ((n - 1) * prevTime + currentTime) / n;
                if (html) {
                    const genTab = await browser.tabs.get(tabId);
                    times[i - 1].triples = parseInt(genTab.title);
                }
                flag = false;
                if (i >= 100 && html) {
                    n++;
                    i = 0;
                }
                if (n > 5)
                    await finish();
                else
                    await iterate();
            }
        }

        async function iterate() {
            if (html) {
                if (n === 1)
                    times.push({});
                await browser.tabs.remove(tab.id);
                tab = await browser.tabs.create({});
            }
            if (html)
                i++;
            const uri = serverURI + "/p/" + i;
            const htmlURI = uri + ".html";
            const ttlURI = uri + ".ttl";
            browser.tabs.update(tab.id, {
                url: html ? htmlURI : ttlURI
            });
            html = !html;
        }

        async function finish() {
            interceptor.setPerformanceEvaluation(false);
            console.log(times);
            browser.tabs.onUpdated.removeListener(listener);
            browser.tabs.remove(tab.id);
            await fetch(serverURI + "/p/times.json", {
                method: 'PUT',
                headers: {
                    'Content-Type': "application/json"
                },
                body: JSON.stringify(times)
            });
            resolve();
        }
    });
}

/**
 * Evaluate the conformance of RDF Browser
 * @param serverURI The URI of the server providing the evaluation files
 */
async function evaluateConformance(serverURI) {
    return new Promise(async function (resolve) {
        const htmlFile = await fetch(serverURI + "/c/html.json");
        const ldFile = await fetch(serverURI + "/c/ld.json");
        const html = await htmlFile.json();
        const lod = await ldFile.json();
        let htmlCount = 0;
        let done = false;

        function listener(tabId, changeInfo) {
            if (!tabStatuses.hasOwnProperty(tabId.toString()) || !changeInfo.hasOwnProperty("status"))
                return;
            const tabStatus = tabStatuses[tabId.toString()];
            if (tabStatus === "loading" && changeInfo.status === "complete") {
                delete tabStatuses[tabId.toString()];
                browser.tabs.remove(tabId);
                if (done && JSON.stringify(tabStatuses) === "{}") {
                    browser.tabs.onUpdated.removeListener(listener);
                    const data = interceptor.getConformanceData();
                    interceptor.setConformanceEvaluation(false);
                    uploadData(data);
                }
                return;
            }
            if (tabStatus === "initialized" && changeInfo.status === "loading" && changeInfo.hasOwnProperty("url") &&
                changeInfo.url.startsWith("http"))
                tabStatuses[tabId.toString()] = "loading";
        }

        async function uploadData(data) {
            const HTMLmisses = [];
            const TurtleMisses = [];
            for (const number in data) {
                const entry = data[number];
                if (number <= htmlCount && entry.turtle !== null)
                    HTMLmisses.push(entry.uri);
                else if (number > htmlCount && entry.turtle === null)
                    TurtleMisses.push(entry.uri);
                else if (number > htmlCount && entry.turtle !== null) {
                    await fetch(serverURI + "/c/" + (number - htmlCount).toString() + ".ttl", {
                        method: 'PUT',
                        headers: {
                            'Content-Type': "application/json"
                        },
                        body: JSON.stringify({turtleString: entry.turtle})
                    });
                }
            }
            const misses = {
                html: HTMLmisses,
                turtle: TurtleMisses
            };
            await fetch(serverURI + "/c/" + "misses.json", {
                method: 'PUT',
                headers: {
                    'Content-Type': "application/json"
                },
                body: JSON.stringify(misses)
            });
            resolve();
        }

        const tabStatuses = {};
        browser.tabs.onUpdated.addListener(listener);
        interceptor.setConformanceEvaluation(true);

        async function handleURI(uri, timeout) {
            uri = uri.replace('bp.blogspot', 'blogspot'); //workaround for bp.blogspot.com
            const tab = await browser.tabs.create({});
            tabStatuses[tab.id] = "initialized";
            browser.tabs.update(tab.id, {
                url: uri
            });
            await new Promise((resolve => {
                setTimeout(resolve, timeout);
            }));
        }

        for (const entry in html) {
            htmlCount++;
            await handleURI(html[entry], 600);
        }

        for (const entry in lod)
            await handleURI(lod[entry].uri, 600);

        done = true;
    });
}

/**
 * Initialize the storage with the plugin default options and set the listener for option changes (background script)
 * or initialize the page template (content script)
 */
if (document.body.id === "template") {
    document.body.onloaddone = content.init().then();
} else {
    ts.fetchDynamicContents().then(() => {
    });
    browser.storage.onChanged.addListener(() => {
        utils.getOptions().then(res => options = res);
    });
    browser.storage.sync.get("options").then(result => {
        if (result.options === undefined) {
            result = {
                options: defaultOptions
            };
        } else {
            for (const option in defaultOptions) {
                if (!result.options.hasOwnProperty(option))
                    result.options[option] = defaultOptions[option];
                else if (option.startsWith("all")) {
                    for (const child in defaultOptions[option]) {
                        if (child !== "custom" && child !== "selected")
                            result.options[option][child] = defaultOptions[option][child];
                    }
                }
            }
        }
        browser.storage.sync.set(result);
        options = result.options;
        initMessageListeners();
    });
}
