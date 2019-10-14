const datatypes = {
    string: "http://www.w3.org/2001/XMLSchema#string",
    integer: "http://www.w3.org/2001/XMLSchema#integer",
    decimal: "http://www.w3.org/2001/XMLSchema#decimal",
    langString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
};

class Triplestore {
    constructor() {
        this.triples = [];
        this.prefixes = [];
        this.uris = {};
        this.blankNodes = {};
        this.literals = [];
    }

    getURI(value) {
        let uri = this.uris[value];
        if(!uri) {
            uri = new URI(value);
            this.uris[value] = uri;
        }
        return uri;
    }

    getBlankNode(name) {
        let bn = this.blankNodes[name];
        if(!bn) {
            bn = new BlankNode(name);
            this.blankNodes[name] = bn;
        }
        return bn;
    }

    getLiteral(value, datatype, language=null) {
        const literal = new Literal(value, datatype, this, language);
        this.literals.push(literal);
        return literal;
    }

    addPrefix(name, value) {
        for(let i=0; i<this.prefixes.length; i++) {
            const prefix = this.prefixes[i];
            if (prefix.name === name)
                return prefix;
        }
        const uri = this.getURI(value);
        this.insert(new Prefix(name, uri), true);
    }

    addTriple(subject, predicate, object) {
        this.insert(new Triple(subject, predicate, object));
    }

    insert(item, isPrefix=false) {
        const list = (isPrefix ? this.prefixes : this.triples);
        let cursor = list[0];
        let i = 0;
        while(cursor && cursor.compareTo(item) <= 0) {
            i++;
            cursor = list[i];
        }
        list.splice(i, 0, item);
    }

    finalize() {
        for(const uri in this.uris)
            this.uris[uri].updatePrefix(this.prefixes);
        for(const literal in this.literals)
            this.literals[literal].updatePrefix(this.prefixes);
        for(const uri in this.uris)
            this.uris[uri].createHtml();
        for(const blankNode in this.blankNodes)
            this.blankNodes[blankNode].createHtml();
        for(const literal in this.literals)
            this.literals[literal].createHtml();
        for(const prefix in this.prefixes)
            this.prefixes[prefix].createHtml();
    }

    getTriplesWithSameFieldAs(index, field, indices=null, indicesIndex=0) {
        if(index < 0 || index >= this.triples.length ||
            (indices && (indicesIndex < 0 || indicesIndex >= indices.length)))
            return null;
        const value = this.triples[index][field];
        let cursor = value;
        const result = [];
        while(cursor === value) {
            result.push(index);
            indicesIndex++;
            if(indices && indicesIndex >= indices.length)
                break;
            index = indices ? indices[indicesIndex] : index+1;
            if(index >= this.triples.length)
                break;
            cursor = this.triples[index][field];
        }
        return result;
    }
}

class Triple {
    constructor(subject, predicate, object) {
        this.subject = subject;
        subject.addTriple(this);
        this.predicate = predicate;
        predicate.addTriple(this);
        this.object = object;
        object.addTriple(this);
    }

    compareTo(triple) {
        let comp = this.subject.compareTo(triple.subject);
        if(comp === 0)
            comp = this.predicate.compareTo(triple.predicate);
        if(comp === 0)
            comp = this.object.compareTo(triple.object);
        return comp;
    }
}

class Resource {
    constructor(value) {
        this.value = value;
        this.html = null;
        this.representationLength = 0;
        this.triples = [];
    }

    compareTo(resource) {
        return this.value.localeCompare(resource.value);
    }

    addTriple(triple) {
        this.triples.push(triple);
    }
}

class URI extends Resource {
    constructor(value) {
        super(value);
        this.prefix = null;
    }

    updatePrefix(prefixes) {
        if(this.prefix !== null)
            return;
        for(let i=0; i<prefixes.length; i++) {
            const prefix = prefixes[i];
            const value = prefix.value.value;
            if(this.value.length > value.length && this.value.substr(0, value.length) === value) {
                this.prefix = prefix;
                return;
            }
        }
    }

    createHtml(retrieveHtml=false, forPrefix=false) {
        const html = document.createElement("span");
        const link = document.createElement("a");
        link.setAttribute("href", this.value);
        if(!forPrefix && this.prefix !== null) {
            const prefixValue = this.prefix.value.value;
            const value = this.prefix.name + ":" + this.value.substr(prefixValue.length, this.value.length);
            link.appendChild(document.createTextNode(value));
            html.appendChild(link);
            if(this.html === null)
                this.representationLength = value.length;
        }
        else {
            link.appendChild(document.createTextNode(this.value));
            html.appendChild(document.createTextNode("<"));
            html.appendChild(link);
            html.appendChild(document.createTextNode(">"));
            if(forPrefix)
                return html;
            if(this.html === null)
                this.representationLength = this.value.length + 2;
        }
        if(this.html === null)
            this.html = html;
        if(retrieveHtml)
            return html;
    }
}

class BlankNode extends Resource {
    constructor(value) {
        super(value);
        this.representationLength = value.length + 2;
    }

    compareTo(resource) {
        if((typeof resource === typeof this) && /b[0-9]+/.test(this.value) && /b[0-9]+/.test(resource.value)) {
            const myNumber = parseInt(this.value.substring(1, this.value.length));
            const otherNumber = parseInt(resource.value.substring(1, resource.value.length));
            return myNumber < otherNumber ? -1 : (myNumber > otherNumber ? 1 : 0);
        }
        return this.value.localeCompare(resource.value);
    }

    createHtml() {
        const html = document.createElement("span");
        html.appendChild(document.createTextNode("_:" + this.value));
        this.html = html;
    }
}

class Literal extends Resource {
    constructor(value, datatype, triplestore, language=null) {
        super(value);
        this.dtype = triplestore.getURI(datatype);
        if(this.dtype.value !== datatypes.langString)
            language = null;
        this.language = language;
    }

    updatePrefix(prefixes) {
        this.dtype.updatePrefix(prefixes);
    }

    createHtml() {
        const html = document.createElement("span");
        let node;
        switch(this.dtype.value) {
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
                for(let i=0; i<n; ++i)
                    html.appendChild(dtypeHtml.childNodes[0]);
                this.html = html;
                return;
        }
        html.appendChild(node);
        this.html = html;
    }
}

class Prefix extends Resource {
    constructor(name, value) {
        super(value);
        this.name = name;
    }

    createHtml() {
        const html = document.createElement("span");
        html.appendChild(document.createTextNode("@prefix " + this.name + ": "));
        html.appendChild(this.value.createHtml(true, true));
        html.appendChild(document.createTextNode(" ."));
        this.html = html;
    }

    compareTo(prefix) {
        return this.name.localeCompare(prefix.name);
    }
}

function getTriplestore() {
    return new Triplestore();
}

module.exports = {getTriplestore};
