const browser = window.browser || window.chrome;
const parser = require("./parser");

function getAndRewritePayload() {
    return new Promise(resolve => {
        const params = new URL(location.href).searchParams;
        const url = params.get("url");
        document.getElementById("title").innerText = url;
        const encoding = decodeURIComponent(params.get("encoding"));
        const format = decodeURIComponent(params.get("format"));
        browser.runtime.sendMessage("acceptHeader").then(header => {
            const request = new Request(url, {
                headers: new Headers({
                    'Accept': header.toString()
                })
            });
            fetch(request).then(response => response.body).then(body => {
                render(body.getReader(), new TextDecoder(encoding), format).then(() => {
                    resolve();
                });
            });
        });
    });
}

async function render(stream, decoder, format) {
    const triplestore = await parser.obtainTriplestore(stream, decoder, format);
    return createDocument(triplestore);
}

async function createDocument(store) {
    const body = document.body;
    while (body.firstChild)
        body.removeChild(body.firstChild);
    const prefixes = document.createElement("p");
    body.appendChild(prefixes);
    prefixes.setAttribute("class", "prefixes");
    store.prefixes.forEach(prefix => {
        if (prefix.html === null)
            prefix.createHtml();
        prefixes.appendChild(prefix.html);
        prefixes.appendChild(document.createElement("br"));
    });
    const triples = document.createElement("p");
    triples.setAttribute("class", "triples");
    body.appendChild(triples);
    let subjectIndex = 0;
    while (subjectIndex < store.triples.length) {
        const result = writeTriple(store, subjectIndex);
        subjectIndex = result.subjectIndex;
        triples.appendChild(result.triple);
    }
}

function writeTriple(store, subjectIndex) {
    const triple = document.createElement("p");
    triple.setAttribute("class", "triple");
    const subject = store.triples[subjectIndex].subject;
    if (subject.html === null)
        subject.createHtml();
    const subjectWrapper = document.createElement("span");
    subjectWrapper.setAttribute("class", "subject");
    const subjectElement = subject.html.cloneNode(true);
    subjectWrapper.appendChild(subjectElement);
    triple.appendChild(subjectWrapper);
    const id = subject.value.split("#");
    if (id.length > 1)
        subjectElement.setAttribute("id", id[id.length - 1]);
    triple.appendChild(document.createTextNode(" "));
    const predicateList = store.getTriplesWithSameFieldAs(subjectIndex, "subject");
    let predicateIndex = 0;
    while (predicateIndex < predicateList.length) {
        const predicate = store.triples[predicateList[predicateIndex]].predicate;
        if (predicate.html === null)
            predicate.createHtml();
        const predicateWrapper = document.createElement("span");
        predicateWrapper.setAttribute("class", "predicate");
        const predicateElement = predicate.html.cloneNode(true);
        predicateWrapper.appendChild(predicateElement);
        if (predicateIndex > 0)
            triple.appendChild(document.createTextNode(getIndent(subject.representationLength + 1)));
        triple.appendChild(predicateWrapper);
        triple.appendChild(document.createTextNode(" "));
        const objectList =
            store.getTriplesWithSameFieldAs(predicateList[predicateIndex], "predicate", predicateList, predicateIndex);
        let objectIndex = 0;
        while (objectIndex < objectList.length) {
            const object = store.triples[objectList[objectIndex]].object;
            if (object.html === null)
                object.createHtml();
            const objectWrapper = document.createElement("span");
            objectWrapper.setAttribute("class", "object");
            const objectElement = object.html.cloneNode(true);
            objectWrapper.appendChild(objectElement);
            if (objectIndex > 0)
                triple.appendChild(document.createTextNode(
                    getIndent(subject.representationLength + predicate.representationLength + 2)
                ));
            triple.appendChild(objectWrapper);
            subjectIndex++;
            predicateIndex++;
            objectIndex++;
            triple.appendChild(document.createTextNode(" "));
            if (objectIndex < objectList.length) {
                triple.appendChild(document.createTextNode(","));
                triple.appendChild(document.createElement("br"));
            }
        }
        if (predicateIndex < predicateList.length) {
            triple.appendChild(document.createTextNode(" ;\n"));
            triple.appendChild(document.createElement("br"));
        } else
            triple.appendChild(document.createTextNode(" "));
    }
    triple.appendChild(document.createTextNode(" ."));
    return {triple, subjectIndex};

    function getIndent(spaces) {
        let output = "";
        for (let i = 0; i < spaces; i++)
            output += "\u00A0";
        return output;
    }
}

document.body.onloaddone = getAndRewritePayload();
