const browser = window.browser;
let options;
let baseURL;
let tab;

async function init() {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    tab = tabs[0];
    const requestDetails = await browser.runtime.sendMessage(["requestDetails", tab.id.toString()]);
    if (requestDetails && requestDetails.hasOwnProperty("reqUrl"))
        baseURL = requestDetails.reqUrl;
    else
        baseURL = tab.url;
    if (baseURL.startsWith("moz")) {
        baseURL = (tab.url.split('url=')[1]).split('&')[0];
        baseURL = new URL(decodeURIComponent(baseURL));
        baseURL = baseURL.protocol + "//" + baseURL.host + baseURL.pathname;
    }
    const getting = await browser.storage.sync.get("options");
    options = getting.options;
    setCheckboxes();
    document.getElementById("switch").addEventListener("click", () => switchMode());
    document.getElementById("settings").addEventListener("click", () => openSettings());
}

function setCheckboxes() {
    for (const option in options.quickOptions) {
        document.getElementById(option).checked = options.quickOptions[option];
        document.getElementById(option).addEventListener("change", save);
    }
    const text = options.contentScript ? " Browser Mode" : " Editor Mode";
    document.getElementById("switch").appendChild(document.createTextNode(text));
}

function save() {
    for (const option in options.quickOptions)
        options.quickOptions[option] = document.getElementById(option).checked;
    browser.storage.sync.set({
        options: options
    });
}

function switchMode() {
    options.contentScript = !options.contentScript;
    browser.storage.sync.set({
        options: options
    });
    browser.tabs.update(tab.id, {url: baseURL});
    window.close();
}

function openSettings() {
    browser.runtime.openOptionsPage().then(() => window.close());
}

init().then();
