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
    const body = document.getElementById("body");
    while (body.firstChild)
        body.removeChild(body.firstChild);
    const prefixes = document.createElement("p");
    body.appendChild(prefixes);
    prefixes.setAttribute("class", "prefixes");
    store.prefixes.forEach(prefix => {
        if(prefix.html === null)
            prefix.createHtml();
        prefixes.appendChild(prefix.html);
        prefixes.appendChild(document.createElement("br"));
    });
    const triples = document.createElement("p");
    body.appendChild(triples);
    let subjectIndex = 0;
    while(subjectIndex < store.triples.length) {
        const result = writeTriple(store, subjectIndex);
        subjectIndex = result.subjectIndex;
        triples.appendChild(result.triple);
    }
}

function writeTriple(store, subjectIndex) {
    const triple = document.createElement("p");
    triple.setAttribute("class", "triple");
    const subject = store.triples[subjectIndex].subject;
    if(subject.html === null)
        subject.createHtml();
    const subjectElement = subject.html.cloneNode(true);
    triple.appendChild(subjectElement);
    subjectElement.setAttribute("class", "subject");
    const id = subject.value.split("#");
    if(id.length > 1)
        subjectElement.setAttribute("id", id[id.length - 1]);
    subjectElement.appendChild(document.createTextNode(" "));
    const predicateList = store.getTriplesWithSameFieldAs(subjectIndex, "subject");
    let predicateIndex = 0;
    while(predicateIndex < predicateList.length) {
        const predicate = store.triples[predicateList[predicateIndex]].predicate;
        if(predicate.html === null)
            predicate.createHtml();
        const predicateElement = predicate.html.cloneNode(true);
        if(predicateIndex > 0)
            subjectElement.appendChild(document.createTextNode(getIndent(subject.representationLength + 1)));
        subjectElement.appendChild(predicateElement);
        predicateElement.setAttribute("class", "predicate");
        predicateElement.appendChild(document.createTextNode(" "));
        const objectList =
            store.getTriplesWithSameFieldAs(predicateList[predicateIndex], "predicate", predicateList, predicateIndex);
        let objectIndex = 0;
        while(objectIndex < objectList.length) {
            const object = store.triples[objectList[objectIndex]].object;
            if(object.html === null)
                object.createHtml();
            const objectElement = object.html.cloneNode(true);
            if(objectIndex > 0)
                predicateElement.appendChild(document.createTextNode(
                    getIndent(subject.representationLength + predicate.representationLength + 2)
                ));
            predicateElement.appendChild(objectElement);
            subjectIndex++;
            predicateIndex++;
            objectIndex++;
            predicateElement.appendChild(document.createTextNode(" "));
            if(objectIndex < objectList.length) {
                predicateElement.appendChild(document.createTextNode(","));
                predicateElement.appendChild(document.createElement("br"));
            }
        }
        if(predicateIndex < predicateList.length) {
            subjectElement.appendChild(document.createTextNode(" ;\n"));
            subjectElement.appendChild(document.createElement("br"));
        }
        else
            subjectElement.appendChild(document.createTextNode(" "));
    }
    triple.appendChild(document.createTextNode(" ."));
    return {triple, subjectIndex};

    function getIndent(spaces) {
        let output = "";
        for(let i=0; i<spaces; i++)
            output += "\u00A0";
        return output;
    }
}

document.getElementById("body").onloaddone = getAndRewritePayload();
