const browser = window.browser || window.chrome;
const templatePath = "src/template.html";
const scriptPath = "src/style.js";
const parser = require("./parser");

function getAndRewritePayload() {
    return new Promise(resolve => {
        const params = new URL(location.href).searchParams;
        const url = params.get("url");
        document.getElementById("title").innerText = url; //TODO create title element
        const encoding = decodeURIComponent(params.get("encoding"));
        const format = decodeURIComponent(params.get("format"));
        browser.runtime.sendMessage("acceptHeader").then(header => {
            const request = new Request(url, {
                headers: new Headers({
                    'Accept': header.toString()
                })
            });
            fetch(request).then(response => response.body).then(body => {
                render(body.getReader(), new TextDecoder(encoding), format, true).then(() => {
                    resolve();
                });
            });
        });
    });
}

async function render(stream, decoder, format, contentScript) {
    if (contentScript) {
        const triplestore = await parser.obtainTriplestore(stream, decoder, format, true);
        return fillDocument(document, triplestore);
    } else {
        let template = await getTemplate();
        template = await injectScript(template);
        const triplestore = await parser.obtainTriplestore(stream, decoder, format, false);
        return createDocument(template, triplestore);
    }
}

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
    return new Promise(resolve => {
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
        resolve(new XMLSerializer().serializeToString(document));
    });
}

async function fillDocument(document, store) {
    const body = document.body;
    while (body.firstChild)
        body.removeChild(body.firstChild);
    const prefixes = document.createElement("div");
    body.appendChild(prefixes);
    prefixes.setAttribute("class", "prefixes");
    prefixes.setAttribute("id", "prefixes");
    store.prefixes.forEach(prefix => {
        if (prefix.html === null)
            prefix.createHtml();
        prefixes.appendChild(prefix.html);
        prefixes.appendChild(document.createElement("br"));
    });
    const triples = document.createElement("div");
    triples.setAttribute("class", "triples");
    triples.setAttribute("id", "triples");
    body.appendChild(triples);
    let subjectIndex = 0;
    while (subjectIndex < store.triples.length) {
        const result = writeTriple(store, subjectIndex);
        subjectIndex = result.subjectIndex;
        triples.appendChild(result.triple);
    }

    //Button #1
    var btn = document.createElement("button");
    btn.innerHTML = "Make content editable";
    btn.setAttribute('id', 'editable-button');
    btn.setAttribute("onclick", "makeEditable()");
    body.appendChild(btn);

    //Button #2
    var btn2 = document.createElement("button");
    btn2.innerHTML = "Send put-request";
    btn2.setAttribute('id', 'put-request-button');
    btn2.setAttribute("onclick", "putRequest()");
    body.appendChild(btn2);
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
        if (predicateIndex > 0) {
            //New Indendation
            var indent = document.createElement("SPAN");
            indent.style.marginLeft = (((subject.representationLength + 1) * 8.83) + "px");
            triple.appendChild(indent);
        }
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
            if (objectIndex > 0) {
                //New Indendation
                var indent = document.createElement("SPAN");
                indent.style.marginLeft = (((subject.representationLength + 2) * 8.83) + "px");
                triple.appendChild(indent);
            }
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
}

if (document.body.id === "template")
    document.body.onloaddone = getAndRewritePayload();

module.exports.render = render;
