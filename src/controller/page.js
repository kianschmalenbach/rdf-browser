const browser = window.browser;
const parser = new DOMParser();
let port;

function init() {
    port = browser.runtime.connect();
    port.onMessage.addListener(handleMessage);
    getAndRewritePayload();
}

function getAndRewritePayload() {
    const params = new URL(location.href).searchParams;
    const url = params.get("url");
    document.getElementById("title").innerText = url;
    const encoding = decodeURIComponent(params.get("encoding"));
    const format = decodeURIComponent(params.get("format"));
    const call = [
        "render",
        url,
        encoding,
        format
    ];
    port.postMessage(call);
}

function handleMessage(message) {
    let msg = Array.isArray(message) ? message[0] : message;
    switch (msg) {
        case "status":
            document.getElementById("status").innerText = message[1];
            break;
        case "start":
            document.getElementById("hint").remove();
            document.getElementById("status").remove();
            break;
        case "prefix":
        case "triple":
            const element = document.getElementById(msg + (msg.endsWith('e') ? "s" : "es"));
            const fragment = parser.parseFromString(message[1], "text/html");
            while (fragment.body.firstElementChild)
                element.appendChild(fragment.body.firstElementChild);
            break;
        case "error":
            document.open();
            document.write(message[1]);
            document.close();
            break;
    }
}

document.body.onloaddone = init();
