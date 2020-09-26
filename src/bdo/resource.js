const datatypes = {
    string: "http://www.w3.org/2001/XMLSchema#string",
    integer: "http://www.w3.org/2001/XMLSchema#integer",
    decimal: "http://www.w3.org/2001/XMLSchema#decimal",
    langString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
};

class Resource {
    constructor(value) {
        this.value = value;
        this.html = null;
        this.constituents = {
            subject: [],
            predicate: [],
            object: []
        };
        this.representationLength = 0;
        this.id = null;
    }

    compareTo(resource, position = "") {
        if (["subject", "object"].includes(position))
            return this.compareTypes(this, resource);
        return compareValues(this.value, resource.value);
    }

    compareTypes(a, b) {
        const typeA = a.getTypeNumber();
        const typeB = b.getTypeNumber();
        if (typeA <= 0 || typeB <= 0 || typeA === typeB)
            return a.compareTo(b);
        else
            return (typeA < typeB) ? -1 : 1;
    }

    getTypeNumber() {
        return 0;
    }

    addSubject(subject) {
        this.constituents.subject.push(subject);

    }

    addPredicate(predicate) {
        this.constituents.predicate.push(predicate);
    }

    addObject(object) {
        this.constituents.object.push(object);
    }
}

class URI extends Resource {
    constructor(value) {
        super(value);
        this.prefix = null;
        const id = value.split("#");
        if (id.length > 1 && id[id.length - 1] !== "")
            this.id = id[id.length - 1];
    }

    updatePrefix(prefixes) {
        if (this.prefix !== null)
            return;
        for (let i = 0; i < prefixes.length; i++) {
            const prefix = prefixes[i];
            const value = prefix.value.value;
            if (this.value.length > value.length && this.value.substr(0, value.length) === value) {
                this.prefix = prefix;
                prefix.used = true;
                return;
            }
        }
    }

    createHtml(retrieveHtml = false, forPrefix = false) {
        const html = document.createElement("span");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(this.value));
        if (!forPrefix && this.prefix !== null) {
            html.setAttribute("class", "postfix");
            const prefixElement = document.createElement("span");
            prefixElement.setAttribute("class", "prefixName");
            const prefixText = this.prefix.name;
            prefixElement.appendChild(document.createTextNode(prefixText));
            const prefixValue = this.prefix.value.value;
            const postfixText = ":" + this.value.substr(prefixValue.length, this.value.length);
            link.appendChild(prefixElement);
            link.appendChild(document.createTextNode(postfixText));
            html.appendChild(link);
            if (this.html === null)
                this.representationLength = prefixText.length + postfixText.length;
        } else {
            html.setAttribute("class", "uri");
            link.appendChild(document.createTextNode("<"));
            link.appendChild(document.createTextNode(this.value));
            link.appendChild(document.createTextNode(">"));
            html.appendChild(link);
            if (forPrefix)
                return html;
            if (this.html === null)
                this.representationLength = this.value.length + 2;
        }
        if (this.html === null)
            this.html = html;
        if (retrieveHtml)
            return html;
    }

    getTypeNumber() {
        return 2;
    }
}

class BlankNode extends Resource {
    constructor(value) {
        super(value);
        this.representationLength = value.length + 2;
        this.id = "_:" + value;
    }

    compareTo(resource, position = "") {
        if (["subject", "object"].includes(position))
            return this.compareTypes(this, resource);
        if ((typeof resource === typeof this) && /b[0-9]+/.test(this.value) && /b[0-9]+/.test(resource.value)) {
            const myNumber = parseInt(this.value.substring(1, this.value.length));
            const otherNumber = parseInt(resource.value.substring(1, resource.value.length));
            return myNumber < otherNumber ? -1 : (myNumber > otherNumber ? 1 : 0);
        }
        return compareValues(this.value, resource.value);
    }

    createHtml() {
        const html = document.createElement("span");
        const link = document.createElement("a");
        link.setAttribute("href", "#_:" + this.value);
        link.appendChild(document.createTextNode("_:" + this.value));
        html.appendChild(link);
        link.setAttribute("class", "blankNode");
        this.html = html;
    }

    getTypeNumber() {
        return 3;
    }
}

class Literal extends Resource {
    constructor(value, datatype, triplestore, language = null) {
        super(value.replace(new RegExp("\"", 'g'), "\'"));
        this.dtype = triplestore.getURI(datatype);
        if (this.dtype.value !== datatypes.langString)
            language = null;
        this.language = language;
    }

    updatePrefix(prefixes) {
        this.dtype.updatePrefix(prefixes);
    }

    createHtml() {
        const html = document.createElement("span");
        html.setAttribute("class", "literal");
        let node;
        switch (this.dtype.value) {
            case datatypes.string:
                node = document.createTextNode("\"" + this.value + "\"");
                break;
            case datatypes.integer:
            case datatypes.decimal:
                node = document.createTextNode(this.value);
                break;
            case datatypes.langString:
                node = document.createTextNode("\"" + this.value + "\"@" + this.language);
                break;
            default:
                node = document.createTextNode("\"" + this.value + "\"^^");
                html.appendChild(node);
                const dtypeHtml = this.dtype.createHtml(true);
                const n = dtypeHtml.childNodes.length;
                for (let i = 0; i < n; ++i)
                    html.appendChild(dtypeHtml.childNodes[0]);
                this.html = html;
                return;
        }
        html.appendChild(node);
        this.html = html;
    }

    getTypeNumber() {
        return 2;
    }
}

function compareValues(a, b) {
    const pattern = /[^[0-9][0-9]+$/;
    if (pattern.test(a) && pattern.test(b)) {
        const aLength = (a.match(pattern)[0]).length - 1;
        const bLength = (b.match(pattern)[0]).length - 1;
        const aString = a.substring(0, a.length - aLength);
        const bString = b.substring(0, b.length - bLength);
        if (aString === bString) {
            const aInt = parseInt(a.substring(aString.length));
            const bInt = parseInt(b.substring(bString.length));
            return aInt < bInt ? -1 : (aInt > bInt ? -1 : 0);
        }
    }
    return a.localeCompare(b);
}

module.exports = {Resource, URI, BlankNode, Literal, compareValues};
