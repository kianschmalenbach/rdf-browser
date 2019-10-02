const formats = require("@rdfjs/formats-common");
const RdfXmlParser = require("rdfxml-streaming-parser").RdfXmlParser;
const Readable = require("stream").Readable;
const ts = require("./triplestore");

function obtainTriplestore(data, format) {
    return new Promise((resolve, reject) => {
        let parser;
        if(format === "application/rdf+xml")
            parser = new RdfXmlParser();
        else {
            const readable = new Readable({
                read: () => {
                    readable.push(data);
                    readable.push(null);
                }
            });
            parser = formats.parsers.import(format, readable);
        }
        if(!parser)
            reject("Unsupported format");
        const store = ts.getTriplestore();
        parser
            .on("data", triple => {
                const subject = processResource(store, triple.subject);
                const predicate = processResource(store, triple.predicate);
                const object = processResource(store, triple.object);
                store.addTriple(subject, predicate, object);
            })
            .on("prefix", (prefix, ns) => {
                store.addPrefix(prefix, ns.value);
            })
            .on("error", error => {
                reject(error);
            })
            .on("end", () => {
                resolve(store);
            });
        if(format === "application/rdf+xml") {
            parser.write(data);
            parser.end();
        }
    });
}

function processResource(store, resource) {
    const value = resource.value;
    const resourceType = Object.getPrototypeOf(resource).termType;
    if(!resourceType)
        return null;
    switch(resourceType) {
        case "BlankNode":
            return store.getBlankNode(value);
        case "NamedNode":
            return store.getURI(value);
        case "Literal":
            return store.getLiteral(value, resource.datatype.value, resource.language);
    }
    return null;
}

module.exports = {obtainTriplestore};
