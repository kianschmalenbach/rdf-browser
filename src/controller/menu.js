const browser = window.browser;
let port;
let options;
let baseURL;
let tab;

async function init() {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    tab = tabs[0];
    const requestDetails = await browser.runtime.sendMessage(["requestDetails", tab.id.toString()]);
    baseURL = requestDetails.url;
    if (baseURL.startsWith("moz")) {
        baseURL = (tab.url.split('url=')[1]).split('&')[0];
        baseURL = new URL(decodeURIComponent(baseURL));
        baseURL = baseURL.protocol + "//" + baseURL.host + baseURL.pathname;
    }
    port = browser.runtime.connect();
    port.onMessage.addListener(o => {
        options = o;
        setCheckboxes();
    });
    port.postMessage("quickOptions");
    document.getElementById("refresh").addEventListener("click", () => refresh());
    document.getElementById("settings").addEventListener("click", () => openSettings());
}

function setCheckboxes() {
    for (const option in options) {
        document.getElementById(option).checked = options[option];
        document.getElementById(option).addEventListener("change", save);
    }
}

function save() {
    for (const option in options)
        options[option] = document.getElementById(option).checked;
    port.postMessage(["quickOptions", options]);
}

function refresh() {
    browser.tabs.update(tab.id, {url: baseURL});
    window.close();
}

function openSettings() {
    browser.runtime.openOptionsPage().then(() => window.close());
}

init().then();
