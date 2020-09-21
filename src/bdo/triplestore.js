const resource = require("./resource");
const commonPrefixSource = "https://prefix.cc/popular/all.file.json";
const commonPrefixes = [];

class Triplestore {
    constructor(commonPrefixes = []) {
        this.triples = [];
        this.prefixes = [];
        for (const prefix in commonPrefixes) {
            const name = (commonPrefixes[prefix])[0];
            const value = (commonPrefixes[prefix])[1];
            this.prefixes.push(new Prefix(name, new resource.URI(value)));
        }
        this.uris = {};
        this.blankNodes = {};
        this.literals = [];
    }

    getURI(value) {
        let uri = this.uris[value];
        if (!uri) {
            uri = new resource.URI(value);
            this.uris[value] = uri;
        }
        return uri;
    }

    getBlankNode(name) {
        let bn = this.blankNodes[name];
        if (!bn) {
            bn = new resource.BlankNode(name);
            this.blankNodes[name] = bn;
        }
        return bn;
    }

    getLiteral(value, datatype, language = null) {
        if (datatype === "http://www.w3.org/2001/XMLSchema#decimal")
            value = Number(value).toLocaleString("en-US");
        const literal = new resource.Literal(value, datatype, this, language);
        this.literals.push(literal);
        return literal;
    }

    addPrefix(name, value) {
        for (let i = 0; i < this.prefixes.length; i++) {
            const prefix = this.prefixes[i];
            if (prefix.name === name) {
                if (prefix.value !== value)
                    prefix.value.value = value;
                return;
            }
        }
        this.prefixes.push(new Prefix(name, new resource.URI(value)));
    }

    addTriple(subject, predicate, object) {
        this.triples.push(new Triple(subject, predicate, object));
    }

    finalize(sorting = true) {
        for (const uri in this.uris)
            this.uris[uri].updatePrefix(this.prefixes);
        for (const literal in this.literals)
            this.literals[literal].updatePrefix(this.prefixes);
        this.removeUnusedPrefixes();
        this.prefixes = this.prefixes.sort((a, b) => {
            return a.compareTo(b);
        });
        if (sorting)
            this.triples = this.triples.sort((a, b) => {
                return a.compareTo(b);
            });
    }

    removeUnusedPrefixes() {
        const toRemove = [];
        for (const prefix in this.prefixes) {
            if (!this.prefixes[prefix].used)
                toRemove.push(prefix);
        }
        toRemove.reverse();
        for (const remove in toRemove)
            this.prefixes.splice(toRemove[remove], 1);
    }

    getTriplesWithSameFieldAs(index, field, indices = null, indicesIndex = 0) {
        if (index < 0 || index >= this.triples.length ||
            (indices && (indicesIndex < 0 || indicesIndex >= indices.length)))
            return null;
        const value = this.triples[index][field];
        let cursor = value;
        const result = [];
        while (cursor === value) {
            result.push(index);
            indicesIndex++;
            if (indices && indicesIndex >= indices.length)
                break;
            index = indices ? indices[indicesIndex] : index + 1;
            if (index >= this.triples.length)
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
        let comp = this.subject.compareTo(triple.subject, "subject");
        if (comp === 0)
            comp = this.predicate.compareTo(triple.predicate, "predicate");
        if (comp === 0)
            comp = this.object.compareTo(triple.object, "object");
        return comp;
    }
}

class Prefix {
    constructor(name, value) {
        this.value = value;
        this.name = name;
        this.used = false;
    }

    compareTo(prefix) {
        return resource.compareValues(this.name, prefix.name);
    }
}

function getCommonPrefixes() {
    return new Promise(resolve => {
        fetch(commonPrefixSource).then(response => {
            response.json().then(doc => {
                for (const prefix in doc)
                    commonPrefixes.push([prefix, doc[prefix]]);
                resolve();
            })
        });
    })
}

function getTriplestore(contentScript = true) {
    if (contentScript) {
        return new Promise(resolve => {
            getCommonPrefixes().then(() => {
                resolve(new Triplestore(commonPrefixes));
            });
        })
    } else {
        return new Promise(resolve => {
            resolve(new Triplestore(commonPrefixes));
        });
    }
}

module.exports = {getTriplestore, getCommonPrefixes, Triplestore};
