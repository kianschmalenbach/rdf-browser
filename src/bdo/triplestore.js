const Resource = require("./resource");
const commonPrefixSource = "https://prefix.cc/popular/all.file.json";
const listURIs = {
    first: "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
    rest: "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
    nil: "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
}
const commonPrefixes = [];
const annotationPredicates = [
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "http://www.w3.org/2000/01/rdf-schema#label",
    "http://www.w3.org/2000/01/rdf-schema#comment",
    "http://www.w3.org/2000/01/rdf-schema#seeAlso",
    "http://www.w3.org/2000/01/rdf-schema#domain",
    "http://www.w3.org/2000/01/rdf-schema#range",
    "http://www.w3.org/2000/01/rdf-schema#subClassOf",
    "http://www.w3.org/2000/01/rdf-schema#subPropertyOf"
];

class Triplestore {
    constructor(commonPrefixes = []) {
        this.subjects = [];
        this.prefixes = [];
        for (const prefix in commonPrefixes) {
            const name = (commonPrefixes[prefix])[0];
            const value = (commonPrefixes[prefix])[1];
            this.prefixes.push(new Prefix(name, new Resource.URI(value)));
        }
        this.uris = {};
        this.blankNodes = [];
        this.blankNodeMapping = {};
        this.literals = [];
    }

    getURI(value) {
        let uri = this.uris[value];
        if (!uri) {
            uri = new Resource.URI(value);
            this.uris[value] = uri;
        }
        return uri;
    }

    getBlankNode(name) {
        if (this.blankNodeMapping.hasOwnProperty(name))
            return this.blankNodes[this.blankNodeMapping[name]];
        const number = this.blankNodes.length;
        this.blankNodeMapping[name] = number;
        const bn = new Resource.BlankNode("bn" + number);
        this.blankNodes.push(bn);
        return bn;
    }

    getLiteral(value, datatype, language = null) {
        if (datatype === "http://www.w3.org/2001/XMLSchema#decimal")
            value = Number(value).toLocaleString("en-US");
        const literal = new Resource.Literal(value, datatype, this, language);
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
        this.prefixes.push(new Prefix(name, new Resource.URI(value)));
    }

    addTriple(subject, predicate, object) {
        const s = Subject.getItem(this.subjects, subject);
        const p = Predicate.getItem(s.item.predicates, predicate);
        const o = new Object(object);
        p.item.objects.push(o);
        if (p.isNew)
            s.item.predicates.push(p.item);
        if (s.isNew)
            this.subjects.push(s.item);
    }

    finalize() {
        for (const uri in this.uris)
            this.uris[uri].updatePrefix(this.prefixes);
        for (const literal in this.literals)
            this.literals[literal].updatePrefix(this.prefixes);
        removeUnusedPrefixes(this);
        this.prefixes = this.prefixes.sort((a, b) => a.compareTo(b));
        this.subjects = this.subjects.sort((a, b) => a.compareTo(b));
        for (const s in this.subjects) {
            const subject = this.subjects[s];
            subject.predicates = subject.predicates.sort((a, b) => a.compareTo(b));
            for (const p in subject.predicates) {
                const predicate = subject.predicates[p];
                predicate.objects = predicate.objects.sort((a, b) => a.compareTo(b));
            }
        }
        chainBlankNodes(this);

        function chainBlankNodes(store) {
            for (const b in store.blankNodes) {
                const bn = store.blankNodes[b];
                if (bn.constituents.object.length === 1) {
                    bn.constituents.object[0].setEquivalentSubject(bn.constituents.subject);
                    const index = store.subjects.indexOf(bn.constituents.subject);
                    if (index >= 0)
                        store.subjects.splice(index, 1);
                }
            }
        }

        function removeUnusedPrefixes(store) {
            const toRemove = [];
            for (const prefix in store.prefixes) {
                if (!store.prefixes[prefix].used)
                    toRemove.push(prefix);
            }
            toRemove.reverse();
            for (const remove in toRemove)
                store.prefixes.splice(toRemove[remove], 1);
        }
    }
}

class Prefix {
    constructor(name, value) {
        this.value = value;
        this.name = name;
        this.used = false;
    }

    compareTo(prefix) {
        return Resource.compareValues(this.name, prefix.name);
    }
}

class TripleConstituent {
    constructor(resource) {
        this.resource = resource;
    }

    static getItem(list, resource) {
        return list.find(element => resource === element.resource) || null;
    }

    compareTo(constituent) {
        return this.resource.compareTo(constituent.resource);
    }
}

class Subject extends TripleConstituent {
    constructor(resource) {
        super(resource);
        resource.setSubject(this);
        this.predicates = [];
    }

    static getItem(list, resource) {
        const item = super.getItem(list, resource);
        if (item !== null)
            return {item: item, isNew: false};
        else
            return {item: new Subject(resource), isNew: true};
    }

    getList() {
        if (this.predicates.length !== 2)
            return null;
        const firstP = this.predicates.find(
            element => element.resource instanceof Resource.URI && element.resource.value === listURIs.first
        );
        if (!firstP || firstP.objects.length !== 1)
            return null;
        const restP = this.predicates.find(
            element => element.resource instanceof Resource.URI && element.resource.value === listURIs.rest
        );
        if (!restP || restP.objects.length !== 1)
            return null;
        const rest = restP.objects[0];
        if (rest.resource instanceof Resource.URI && rest.resource.value === listURIs.nil)
            return [firstP.objects[0]];
        const list = rest.getList();
        if (list === null)
            return null;
        list.splice(0, 0, firstP.objects[0]);
        return list;
    }
}

class Predicate extends TripleConstituent {
    constructor(resource) {
        super(resource);
        resource.addPredicate(this);
        this.objects = [];
    }

    static getItem(list, resource) {
        const item = super.getItem(list, resource);
        if (item !== null)
            return {item: item, isNew: false};
        else
            return {item: new Predicate(resource), isNew: true};
    }
}

class Object extends TripleConstituent {
    constructor(resource) {
        super(resource);
        resource.addObject(this);
        this.equivalentSubject = null;
    }

    setEquivalentSubject(subject) {
        this.equivalentSubject = subject;
    }

    getList() {
        if (this.equivalentSubject !== null)
            return this.equivalentSubject.getList();
        else
            return null;
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

function isAnnotationPredicate(uri) {
    return annotationPredicates.includes(uri);
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

module.exports = {getTriplestore, getCommonPrefixes, Triplestore, isAnnotationPredicate};
