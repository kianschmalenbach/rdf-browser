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

function updateOptions() {
    return new Promise(resolve => {
        utils.getOptions().then(res => {
            options = res;
            resolve();
        });
    });
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

    store.subjects.forEach(subject => {
        const triple = document.createElement("p");
        triple.setAttribute("class", "triple");
        serializeTriple(triple, subject);
        triple.appendChild(document.createTextNode(" ."));
        if (port)
            port.postMessage(["triple", serializer.serializeToString(triple)]);
        else
            document.getElementById("triples").appendChild(triple);
    });

    function serializeTriple(triple, subject, indent = 0) {
        if (indent === 0) {
            triple.appendChild(getSubjectWrapper(subject));
            triple.appendChild(document.createTextNode(" "));
        }
        let predicateIndex = 0;
        while (predicateIndex < subject.predicates.length) {
            const predicate = subject.predicates[predicateIndex];
            const predicateWrapper = getPredicateWrapper(predicate);
            const predicateIndent = (indent === 0 ? subject.resource.representationLength : indent) + 1;
            if (predicateIndex > 0)
                triple.appendChild(document.createTextNode(getIndent(predicateIndent)));
            triple.appendChild(predicateWrapper);
            triple.appendChild(document.createTextNode(" "));
            let objectIndex = 0;
            while (objectIndex < predicate.objects.length) {
                const object = predicate.objects[objectIndex];
                const objectIndent = predicateIndent + predicate.resource.representationLength + 1;
                const objectWrapper = getObjectWrapper(object, objectIndent);
                if (objectIndex > 0)
                    triple.appendChild(document.createTextNode(getIndent(objectIndent)));
                triple.appendChild(objectWrapper);
                triple.appendChild(document.createTextNode(" "));
                objectIndex++;
                if (objectIndex < predicate.objects.length) {
                    triple.appendChild(document.createTextNode(","));
                    triple.appendChild(document.createElement("br"));
                }
            }
            predicateIndex++;
            if (predicateIndex < subject.predicates.length) {
                triple.appendChild(document.createTextNode(" ;\n"));
                triple.appendChild(document.createElement("br"));
            } else
                triple.appendChild(document.createTextNode(" "));
        }
    }

    function getSubjectWrapper(subject) {
        if (subject.resource.html === null)
            subject.resource.createHtml();
        const subjectWrapper = document.createElement("span");
        subjectWrapper.setAttribute("class", "subject");
        const subjectElement = subject.resource.html.cloneNode(true);
        subjectWrapper.appendChild(subjectElement);
        if (subject.resource.id !== null)
            subjectElement.setAttribute("id", subject.resource.id);
        return subjectWrapper;
    }

    function getPredicateWrapper(predicate) {
        if (predicate.resource.html === null)
            predicate.resource.createHtml();
        const predicateWrapper = document.createElement("span");
        predicateWrapper.setAttribute("class", "predicate");
        const predicateElement = predicate.resource.html.cloneNode(true);
        predicateWrapper.appendChild(predicateElement);
        return predicateWrapper;
    }

    function getObjectWrapper(object, indent) {
        if (object.resource.html === null)
            object.resource.createHtml();
        const objectWrapper = document.createElement("span");
        objectWrapper.setAttribute("class", "object");
        if (object.subjects.length > 0) {
            for (const subject in object.subjects) {
                objectWrapper.appendChild(document.createTextNode("[ "));
                objectWrapper.appendChild(document.createElement("br"));
                objectWrapper.appendChild(document.createTextNode(getIndent(indent + 2)));
                serializeTriple(objectWrapper, object.subjects[subject], indent + 1);
                objectWrapper.appendChild(document.createElement("br"));
                objectWrapper.appendChild(document.createTextNode(getIndent(indent) + "]"));
            }
        } else {
            const objectElement = object.resource.html.cloneNode(true);
            objectWrapper.appendChild(objectElement);
        }
        return objectWrapper;
    }

    function getIndent(spaces) {
        let output = "";
        for (let i = 0; i < spaces; i++)
            output += "\u00A0";
        return output;
    }
}

module.exports = {render, renderBrowser};
