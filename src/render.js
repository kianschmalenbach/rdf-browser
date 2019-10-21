const templatePath = "src/template.html";
const parser = require("./parser");

async function render(stream, decoder, format) {
    const template = await getTemplate();
    const triplestore = await parser.obtainTriplestore(stream, decoder, format);
    return createDocument(template, triplestore);
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

function createDocument(html, store) {
    return new Promise(resolve =>  {
        const document = new DOMParser().parseFromString(html, "text/html");
        const body = document.getElementById("body");
        const prefixes = document.createElement("p");
        body.appendChild(prefixes);
        prefixes.setAttribute("class", "prefixes");
        store.prefixes.forEach(prefix => {
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
        resolve(new XMLSerializer().serializeToString(document));
    });
}

function writeTriple(store, subjectIndex) {
    const triple = document.createElement("p");
    triple.setAttribute("class", "triple");
    const subject = store.triples[subjectIndex].subject;
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

module.exports.render = render;
