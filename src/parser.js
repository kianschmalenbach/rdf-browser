const RdfXmlParser = require("rdfxml-streaming-parser").RdfXmlParser;
const JsonLdParser = require("@rdfjs/parser-jsonld");
const N3Parser = require("@rdfjs/parser-n3");
const Transform = require("stream").Transform;
const ts = require("./triplestore");
let blankNodeOffset; //workaround for incremental blank node number assignment by parser

function obtainTriplestore(inputStream, decoder, format) {
    return new Promise((resolve, reject) => {
        const parser = getParser(format);
        if (!parser)
            reject("Unsupported format");
        const store = ts.getTriplestore();
        const transformStream = new Transform({
            transform(chunk, encoding, callback) {
                this.push(chunk);
                callback();
            }
        });
        inputStream.ondata = event => {
            let data = decoder.decode(event.data, {stream: true});
            if (typeof data === "string") {
                data = data.replace(new RegExp("<>", 'g'), "<#>"); //workaround for empty URIs
                transformStream.push(data);
            }
        };
        inputStream.onstop = () => {
            transformStream.push(null);
        };
        const outputStream = parser.import(transformStream);
        blankNodeOffset = -1;
        outputStream
            .on("context", context => {
                for (const prefix in context) {
                    if (typeof context[prefix] === "string")
                        store.addPrefix(prefix, context[prefix]);
                }
            })
            .on("data", triple => {
                const subject = processResource(store, triple.subject);
                const predicate = processResource(store, triple.predicate);
                const object = processResource(store, triple.object);
                store.addTriple(subject, predicate, object);
            })
            .on("prefix", (prefix, ns) => {
                if (typeof ns.value === "string" && /^http/.test(ns.value))
                    store.addPrefix(prefix, ns.value);
            })
            .on("error", error => {
                reject(error);
            })
            .on("end", () => {
                store.finalize();
                resolve(store);
            });
    });
}

function getParser(format) {
    switch (format) {
        case "application/rdf+xml":
            return new RdfXmlParser();
        case "application/ld+json":
            return new JsonLdParser();
        case "application/trig":
        case "application/n-quads":
        case "application/n-triples":
        case "text/n3":
        case "text/turtle":
            return new N3Parser();
        default:
            return null;
    }
}

function processResource(store, resource) {
    const value = resource.value;
    const resourceType = Object.getPrototypeOf(resource).termType;
    if (!resourceType)
        return null;
    switch (resourceType) {
        case "BlankNode":
            if (/^b[0-9]+$/.test(value)) {
                const blankNodeNumber = value.substring(1, value.length);
                if (blankNodeOffset === -1)
                    blankNodeOffset = blankNodeNumber;
                return store.getBlankNode("b" + (blankNodeNumber - blankNodeOffset));
            }
            return store.getBlankNode(value);
        case "NamedNode":
            return store.getURI(value);
        case "Literal":
            return store.getLiteral(value, resource.datatype.value, resource.language);
    }
    return null;
}

module.exports = {obtainTriplestore};
