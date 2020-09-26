const Resource = require("./resource");
const commonPrefixSource = "https://prefix.cc/popular/all.file.json";
const commonPrefixes = [];

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
        const p = Predicate.getItem(s.predicates, predicate);
        const o = new Object(object);
        p.addObject(o);
        s.addPredicate(p);
        this.subjects = s.insertSorted(this.subjects);
    }

    finalize() {
        for (const uri in this.uris)
            this.uris[uri].updatePrefix(this.prefixes);
        for (const literal in this.literals)
            this.literals[literal].updatePrefix(this.prefixes);
        removeUnusedPrefixes(this);
        this.prefixes = this.prefixes.sort((a, b) => {
            return a.compareTo(b);
        });
        chainBlankNodes(this);

        function chainBlankNodes(store) {
            for (const b in store.blankNodes) {
                const bn = store.blankNodes[b];
                if (bn.constituents.object.length === 1) {
                    for (const s in bn.constituents.subject) {
                        bn.constituents.object[0].addEquivalentSubject(bn.constituents.subject[s]);
                        const index = store.subjects.indexOf(bn.constituents.subject[s]);
                        if (index >= 0)
                            store.subjects.splice(index, 1);
                    }
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

class Constituent {
    constructor(resource) {
        this.resource = resource;
    }

    static getItem(list, resource) {
        for (const item in list) {
            if (list[item].resource === resource)
                return list[item];
        }
        return null;
    }

    insertSorted(list) {
        if (list.length === 0) {
            list.push(this);
            return list;
        }
        let i = 0;
        let cursor = list[0];
        while (list.length > i && cursor.resource.compareTo(this.resource) < 0)
            cursor = list[++i];
        if (cursor && cursor.resource.compareTo(this.resource) === 0)
            list.splice(i, 1, this);
        else
            list.splice(i, 0, this);
        return list;
    }
}

class Subject extends Constituent {
    constructor(resource) {
        super(resource);
        resource.addSubject(this);
        this.predicates = [];
    }

    static getItem(list, resource) {
        const item = super.getItem(list, resource);
        if (item !== null)
            return item;
        else
            return new Subject(resource);
    }

    addPredicate(predicate) {
        this.predicates = predicate.insertSorted(this.predicates);
    }
}

class Predicate extends Constituent {
    constructor(resource) {
        super(resource);
        resource.addPredicate(this);
        this.objects = [];
    }

    static getItem(list, resource) {
        const item = super.getItem(list, resource);
        if (item !== null)
            return item;
        else
            return new Predicate(resource);
    }

    addObject(object) {
        this.objects = object.insertSorted(this.objects);
    }
}

class Object extends Constituent {
    constructor(resource) {
        super(resource);
        resource.addObject(this);
        this.subjects = [];
    }

    addEquivalentSubject(subject) {
        this.subjects = subject.insertSorted(this.subjects);
    }
}

class Prefix {
    constructor(name, value) {
        this.value = value;
        this.html = null;
        this.name = name;
        this.used = false;
    }

    createHtml() {
        const html = document.createElement("span");
        html.setAttribute("class", "prefix");
        const prefixDeclarationElement = document.createElement("span");
        prefixDeclarationElement.setAttribute("class", "prefixDeclaration");
        prefixDeclarationElement.appendChild(document.createTextNode("@prefix"));
        const prefixElement = document.createElement("span");
        prefixElement.setAttribute("class", "prefixName");
        prefixElement.appendChild(document.createTextNode(this.name));
        const doubleColonElement = document.createElement("span");
        doubleColonElement.setAttribute("class", "postfix");
        doubleColonElement.appendChild(document.createTextNode(":"));
        html.appendChild(prefixDeclarationElement);
        html.appendChild(document.createTextNode(" "));
        html.appendChild(prefixElement);
        html.appendChild(doubleColonElement);
        html.appendChild(document.createTextNode(" "));
        html.appendChild(this.value.createHtml(true, true));
        html.appendChild(document.createTextNode(" ."));
        this.html = html;
    }

    compareTo(prefix) {
        return Resource.compareValues(this.name, prefix.name);
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
