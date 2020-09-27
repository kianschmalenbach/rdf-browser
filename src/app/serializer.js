const serializer = new XMLSerializer();

function serializePrefixes(store, port = null) {
    const html = new DocumentFragment();
    let response = "";
    store.prefixes.forEach(prefix => {
        const prefixWrapper = createPrefixHTML(prefix);
        prefixWrapper.appendChild(document.createElement("br"));
        if (port)
            response += serializer.serializeToString(prefixWrapper);
        else
            html.appendChild(prefixWrapper);
    });
    if (port)
        port.postMessage(["prefix", response]);
    else
        return html;

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
    const html = new DocumentFragment();
    let response = "";
    store.subjects.forEach(subject => {
        const triple = document.createElement("p");
        triple.setAttribute("class", "triple");
        serializeTriple(triple, subject);
        triple.appendChild(document.createTextNode(" ."));
        if (port)
            response += serializer.serializeToString(triple);
        else
            html.appendChild(triple);
    });
    if (port)
        port.postMessage(["triple", response]);
    else
        return html;

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
        if (object.equivalentSubject !== null) {
            objectWrapper.appendChild(document.createTextNode("[ "));
            objectWrapper.appendChild(document.createElement("br"));
            objectWrapper.appendChild(document.createTextNode(getIndent(indent + 2)));
            serializeTriple(objectWrapper, object.equivalentSubject, indent + 1);
            objectWrapper.appendChild(document.createElement("br"));
            objectWrapper.appendChild(document.createTextNode(getIndent(indent) + "]"));
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

module.exports = {serializePrefixes, serializeTriples};
