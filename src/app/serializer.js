const serializer = new XMLSerializer();
const batchSize = 10;

function serializePrefixes(store, port = null) {
    const res = new DocumentFragment();
    let batchCount = 0;
    let batchText = "";
    store.prefixes.forEach(prefix => {
        const html = createPrefixHTML(prefix);
        html.appendChild(document.createElement("br"));
        if (port) {
            batchCount++;
            batchText += serializer.serializeToString(html);
            if (batchCount >= batchSize) {
                port.postMessage(["prefix", batchText]);
                batchCount = 0;
                batchText = "";
            }
        } else
            res.appendChild(html);
    });
    if (port) {
        if (batchCount > 0)
            port.postMessage(["prefix", batchText]);
    } else
        return res;

    function createPrefixHTML(prefix) {
        const html = document.createElement("span");
        html.setAttribute("class", "prefix");
        const prefixDeclarationElement = document.createElement("span");
        prefixDeclarationElement.setAttribute("class", "prefixDeclaration");
        prefixDeclarationElement.appendChild(document.createTextNode("@prefix"));
        const prefixElement = document.createElement("span");
        prefixElement.setAttribute("class", "prefixName");
        prefixElement.appendChild(document.createTextNode(prefix.name));
        const doubleColonElement = document.createElement("span");
        doubleColonElement.setAttribute("class", "postfix");
        doubleColonElement.appendChild(document.createTextNode(":"));
        html.appendChild(prefixDeclarationElement);
        html.appendChild(document.createTextNode(" "));
        html.appendChild(prefixElement);
        html.appendChild(doubleColonElement);
        html.appendChild(document.createTextNode(" "));
        html.appendChild(prefix.value.createHtml(true, true));
        html.appendChild(document.createTextNode(" ."));
        return html;
    }
}

function serializeTriples(store, port = null) {
    const res = new DocumentFragment();
    let batchCount = 0;
    let batchText = "";
    let subjectIndex = 0;
    while (subjectIndex < store.triples.length) {
        const result = createTripleHTML(store, subjectIndex);
        subjectIndex = result.subjectIndex;
        if (port) {
            batchCount++;
            batchText += serializer.serializeToString(result.triple);
            if (batchCount >= batchSize) {
                port.postMessage(["triple", batchText]);
                batchCount = 0;
                batchText = "";
            }
        } else
            res.appendChild(result.triple);
    }
    if (port) {
        if (batchCount > 0)
            port.postMessage(["triple", batchText]);
    } else
        return res;

    function createTripleHTML(store, subjectIndex) {
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
}

module.exports = {serializePrefixes, serializeTriples};
