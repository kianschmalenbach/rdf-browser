let tree_structure = false;
let tree_indent = 4;

function serializePrefixes(store, html = null) {
    if (html === null)
        html = new DocumentFragment();
    store.prefixes.forEach(prefix => {
        if (!prefix.used)
            return;
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

function serializeTriples(store, html = null, uri = null, options = null) {
    if (options) {
        tree_structure = options.tree_structure;
        tree_indent = options.tree_structure_indent;
    }
    
    if (html === null)
        html = new DocumentFragment();
        store.subjects.forEach(subject => {
        if (uri !== null && subject.resource.value !== uri.value)
            return;
        const triple = document.createElement("p");
        triple.setAttribute("class", "triple");
        serializeTriple(triple, subject, (uri !== null ? -1 : 0), uri === null);
        triple.appendChild(document.createTextNode(" ."));
        html.appendChild(triple);
    });
    return html;

    function serializeTriple(triple, subject, indent = 0, serializeSubject = true) {
        if (indent <= 0 && serializeSubject) {
            triple.appendChild(getSubjectWrapper(subject));
            triple.appendChild(document.createTextNode(" "));
        }
        let predicateIndex = 0;
        while (predicateIndex < subject.predicates.length) {
            const predicate = subject.predicates[predicateIndex];
            const predicateWrapper = getPredicateWrapper(predicate);
            let predicateIndent = 0;
            if (tree_structure) {
                predicateIndent = indent + tree_indent;
            } else {
                predicateIndent = (indent === 0 ? subject.resource.representationLength : indent) + 1;
            }
            predicateWrapper.setAttribute("indent", predicateIndent);
            if (predicateIndex > 0 || indent > 0 || tree_structure)
                predicateWrapper.setAttribute("style", "margin-left: " + predicateIndent + "ch;");
            triple.appendChild(predicateWrapper);
            triple.appendChild(document.createTextNode(" "));
            let objectIndex = 0;
            while (objectIndex < predicate.objects.length) {
                const object = predicate.objects[objectIndex];
                let objectIndent = 0;
                if (tree_structure) {
                    objectIndent = indent + 2 * tree_indent;
                }else {
                    objectIndent = predicateIndent + predicate.resource.representationLength + 1;
                }
                const list = object.getList();
                if (list !== null) { // = blank node
                    triple.appendChild(document.createTextNode("( "));
                    for (const i in list) {
                        const wrap_indent = tree_structure ? objectIndent : 0;
                        const objectWrapper = getObjectWrapper(list[i], wrap_indent, true);
                        objectWrapper.setAttribute("indent", objectIndent);
                        if (objectIndex > 0 || tree_structure)
                            objectWrapper.setAttribute("style", "margin-left: " + objectIndent + "ch;");
                        triple.appendChild(objectWrapper);
                        triple.appendChild(document.createTextNode(" "));
                    }
                    triple.appendChild(document.createTextNode(")"));
                } else { // simple Object
                    const objectWrapper = getObjectWrapper(object, objectIndent);
                    objectWrapper.setAttribute("indent", objectIndent);
                    if (objectIndex > 0 || tree_structure)
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
            subject.resource.createHtml(false, false, store.baseURL);
        const subjectWrapper = document.createElement("span");
        subjectWrapper.setAttribute("class", "subject");
        const subjectElement = subject.resource.html.cloneNode(true);
        subjectWrapper.appendChild(subjectElement);
        if (subject.resource.id !== null)
            subjectElement.setAttribute("id", subject.resource.id);
        if (tree_structure){
            subjectWrapper.appendChild(document.createElement("br"));
        }
        return subjectWrapper;
    }

    function getPredicateWrapper(predicate) {
        if (predicate.resource.html === null)
            predicate.resource.createHtml(false, false, store.baseURL);
        const predicateWrapper = document.createElement("span");
        predicateWrapper.setAttribute("class", "predicate");
        const predicateElement = predicate.resource.html.cloneNode(true);
        predicateWrapper.appendChild(predicateElement);
        if (tree_structure){
            predicateWrapper.appendChild(document.createElement("br"));
        }

        return predicateWrapper;
    }

    function getObjectWrapper(object, indent, list = false) {
        if (object.resource.html === null)
            object.resource.createHtml(false, false, store.baseURL);
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
        if (tree_structure) {
//            objectWrapper.appendChild(document.createElement("br"));
        }

        return objectWrapper;
    }
}

module.exports = {serializePrefixes, serializeTriples};
