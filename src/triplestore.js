//const Types = { URI: 1, LITERAL: 2, BLANK_NODE: 3, PREFIX: 4 };

class Triplestore {
    constructor() {
        this.triples = [];
        this.prefixes = [];
        this.uris = {};
        this.blankNodes = {};
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
        return new Literal(value, datatype, this, language);
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
        this.updatePrefixes();
    }

    updatePrefixes() {
        for(let i=0; i<this.triples.length; ++i) {
            const triple = this.triples[i];
            triple.subject.updatePrefix(this.prefixes);
            triple.predicate.updatePrefix(this.prefixes);
            triple.object.updatePrefix(this.prefixes);
        }
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
    constructor(value/*, type*/) {
        this.value = value;
        //this.type = type;
        this.representation = value;
        this.triples = [];
    }

    compareTo(resource) {
        return this.value.localeCompare(resource.value);
    }

    addTriple(triple) {
        this.triples.push(triple);
    }

    updatePrefix(prefixes) {
        //empty method
    }
}

class URI extends Resource {
    constructor(value) {
        super(value/*, Types.URI*/);
        this.prefix = null;
        this.representation = "&lt;<a href='" + value + "'>" + value + "</a>&gt;";
        this.prefixRepresentation = this.representation;
    }

    updatePrefix(prefixes) {
        for(let i=0; i<prefixes.length; i++) {
            const prefix = prefixes[i];
            const value = prefix.value.value;
            if(this.value.length > value.length && this.value.substr(0, value.length) === value) {
                this.prefix = prefix;
                this.representation = "<a href='" + this.value + "'>" + prefix.name + ":" +
                    this.value.substr(value.length, this.value.length) + "</a>";
            }
        }
    }
}

class BlankNode extends Resource {
    constructor(value) {
        super(value/*, Types.BLANK_NODE*/);
        this.representation = "_:" + value;
    }
}

class Literal extends Resource {
    constructor(value, datatype, triplestore, language=null) {
        super(value/*, Types.LITERAL*/);
        this.dtype = triplestore.getURI(datatype);
        if(this.dtype.value !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString")
            language = null;
        this.language = language;
        this.representation = "\"" + value + "\"" + (language ? "@" + language : "^^" + this.dtype.representation);
    }

    updatePrefix(prefixes) {
        this.dtype.updatePrefix(prefixes);
        if(!this.language && this.dtype.prefix != null) {
            this.representation = "\"" + this.value + "\"" + "^^" + this.dtype.representation;
        }
    }
}

class Prefix extends Resource {
    constructor(name, value) {
        super(value/*, Types.PREFIX*/);
        this.name = name;
        this.representation = "@prefix " + name + ": " + value.prefixRepresentation + " .";
    }

    addTriple(triple) {
        //empty method
    }

    compareTo(prefix) {
        return this.name.localeCompare(prefix.name);
    }
}

function getTriplestore() {
    return new Triplestore();
}

module.exports = {getTriplestore};
