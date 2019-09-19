const formats = [
    'application/ld+json',
    'text/turtle'
];

function rewrite(details) {
    let ct = details.responseHeaders.find(h => h.name.toLowerCase() == 'content-type');
    let format = ct ? formats.find(f => ct.value.includes(f)) : false;

    if (format) {
        let filter = browser.webRequest.filterResponseData(details.requestId);
        let decoder = new TextDecoder("utf-8");
        let encoder = new TextEncoder();

        filter.ondata = event => {
            let str = decoder.decode(event.data, {stream: true});
            renderer.render(str, format)
                .then(html => {
                    filter.write(encoder.encode(html));
                    filter.close();
                });
        };

        return {
            responseHeaders: [
                { name: 'Content-Type', value: 'text/html' }
            ]
        };
    }

    return {};
}

filter = {
    urls: ["<all_urls>"]
};

browser.webRequest.onHeadersReceived.addListener(rewrite, filter, ["blocking", "responseHeaders"]);