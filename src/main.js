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
            body_margin: "8px"
        },
        light: {
            width: "99%",
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
            width: "99%",
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
            width: "99%",
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
    whitelist: ""
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
            case "listStatus":
                sendResponse(utils.getListStatus(options, message[1], message[2]));
                break;
        }
    });
    browser.runtime.onConnect.addListener(port => {
        port.onMessage.addListener(message => {
            let msg = Array.isArray(message) ? message[0] : message;
            switch (msg) {
                case "quickOptions":
                    if (Array.isArray(message))
                        interceptor.setQuickOptions(message[1]);
                    else
                        port.postMessage(interceptor.getQuickOptions());
                    break;
            }
        });
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
