let options;
const templatePath = "build/view/template.html";
const scriptPath = "build/controller/style.js";
const serializer = new XMLSerializer();
const parser = require("./parser");
const utils = require("./utils");

async function render(stream, decoder, format, port) {
    await updateOptions();
    const baseIRI = new URL(location.href).searchParams.get("url");
    const triplestore = await parser.obtainTriplestore(stream, decoder, format, true, baseIRI, port);
    const document = new Document();
    fillDocument(document, triplestore, port);
}

async function renderBrowser(stream, decoder, format, baseIRI) {
    await updateOptions();
    let template = await getTemplate();
    template = await injectScript(template);
    const triplestore = await parser.obtainTriplestore(stream, decoder, format, false, baseIRI);
    return createDocument(template, triplestore);

    function getTemplate() {
        return new Promise(resolve => {
            fetch(templatePath)
                .then(file => {
                    return file.text();
                })
                .then(text => {
                    resolve(text);
                })
        });
    }

    function injectScript(template) {
        return new Promise(resolve => {
            fetch(scriptPath)
                .then(file => {
                    return file.text();
                })
                .then(script => {
                    const array = template.split("<!-- script -->");
                    resolve(array[0] + script + array[1]);
                })
        });
    }

    function createDocument(html, store) {
        const document = new DOMParser().parseFromString(html, "text/html");
        document.getElementById("title").remove();
        document.getElementById("content-script").remove();
        document.getElementById("script").removeAttribute("src");
        document.getElementById("hint").remove();
        document.getElementById("status").remove();
        const scriptElement = document.getElementById("script");
        const scriptString = JSON.stringify(options.allStyleTemplate[options.allStyleTemplate.selected]);
        const script = "\nconst style = " + scriptString + ";\n";
        scriptElement.insertBefore(document.createTextNode(script), scriptElement.firstChild);
        fillDocument(document, store);
        return serializer.serializeToString(document);
    }
}

function fillDocument(document, store, port = null) {
    let body = document.body;
    if (!body) {
        body = document.createElement("body");
        document.appendChild(body);
    }
    store.prefixes.forEach(prefix => {
        if (prefix.html === null)
            prefix.createHtml();
        prefix.html.appendChild(document.createElement("br"));
        if (port)
            port.postMessage(["prefix", serializer.serializeToString(prefix.html)]);
        else
            document.getElementById("prefixes").appendChild(prefix.html);
    });
    let subjectIndex = 0;
    while (subjectIndex < store.triples.length) {
        const result = writeTriple(store, subjectIndex);
        subjectIndex = result.subjectIndex;
        if (port)
            port.postMessage(["triple", serializer.serializeToString(result.triple)]);
        else
            document.getElementById("triples").appendChild(result.triple);
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
    if (subject.id !== null)
        subjectElement.setAttribute("id", subject.id);
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

function updateOptions() {
    return new Promise(resolve => {
        utils.getOptions().then(res => {
            options = res;
            resolve();
        });
    });
}

module.exports = {render, renderBrowser};
