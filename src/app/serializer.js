function serializePrefixes(store, html = null) {
    if (html === null)
        html = new DocumentFragment();
    store.prefixes.forEach(prefix => {
        const prefixWrapper = createPrefixHTML(prefix);
        prefixWrapper.appendChild(document.createElement("br"));
        html.appendChild(prefixWrapper);
    });
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

function serializeTriples(store, html = null) {
    if (html === null)
        html = new DocumentFragment();
    store.subjects.forEach(subject => {
        const triple = document.createElement("p");
        triple.setAttribute("class", "triple");
        serializeTriple(triple, subject);
        triple.appendChild(document.createTextNode(" ."));
        html.appendChild(triple);
    });
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
            predicateWrapper.setAttribute("indent", predicateIndent);
            if (predicateIndex > 0 || indent > 0)
                predicateWrapper.setAttribute("style", "margin-left: " + predicateIndent + "ch;");
            triple.appendChild(predicateWrapper);
            triple.appendChild(document.createTextNode(" "));
            let objectIndex = 0;
            while (objectIndex < predicate.objects.length) {
                const object = predicate.objects[objectIndex];
                const objectIndent = predicateIndent + predicate.resource.representationLength + 1;
                const list = object.getList();
                if (list !== null) {
                    triple.appendChild(document.createTextNode("( "));
                    for (const i in list) {
                        const objectWrapper = getObjectWrapper(list[i], 0, true);
                        objectWrapper.setAttribute("indent", objectIndent);
                        if (objectIndex > 0)
                            objectWrapper.setAttribute("style", "margin-left: " + objectIndent + "ch;");
                        triple.appendChild(objectWrapper);
                        triple.appendChild(document.createTextNode(" "));
                    }
                    triple.appendChild(document.createTextNode(")"));
                } else {
                    const objectWrapper = getObjectWrapper(object, objectIndent);
                    objectWrapper.setAttribute("indent", objectIndent);
                    if (objectIndex > 0)
                        objectWrapper.setAttribute("style", "margin-left: " + objectIndent + "ch;");
                    triple.appendChild(objectWrapper);
                }
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

    function getObjectWrapper(object, indent, list = false) {
        if (object.resource.html === null)
            object.resource.createHtml();
        const objectWrapper = document.createElement("span");
        objectWrapper.setAttribute("class", "object");
        if (!list && object.equivalentSubject !== null) {
            objectWrapper.appendChild(document.createTextNode("[ "));
            objectWrapper.appendChild(document.createElement("br"));
            serializeTriple(objectWrapper, object.equivalentSubject, indent + 1);
            objectWrapper.appendChild(document.createElement("br"));
            const closingBracketWrapper = document.createElement("span");
            closingBracketWrapper.appendChild(document.createTextNode("]"));
            closingBracketWrapper.setAttribute("style", "margin-left: " + indent + "ch;");
            objectWrapper.appendChild(closingBracketWrapper);
        } else {
            const objectElement = object.resource.html.cloneNode(true);
            objectWrapper.appendChild(objectElement);
        }
        return objectWrapper;
    }
}

module.exports = {serializePrefixes, serializeTriples};
