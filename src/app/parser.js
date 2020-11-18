const RdfXmlParser = require("rdfxml-streaming-parser").RdfXmlParser;
const JsonLdParser = require("jsonld-streaming-parser").JsonLdParser;
const N3Parser = require("@rdfjs/parser-n3");
const Transform = require("stream").Transform;
const ts = require("../bdo/triplestore");
const rs = require("../bdo/resource");

function obtainTriplestore(inputStream, decoder, format, contentScript, baseIRI) {
    return new Promise((resolve, reject) => {
        const parser = getParser(format, baseIRI);
        if (!parser)
            reject("Unsupported format");
        ts.getTriplestore(baseIRI, contentScript).then(store => {
            parseDocument(inputStream, parser, decoder, format, contentScript, baseIRI, store, resolve, reject);
        });
    });
}

function obtainDescriptions(inputStream, decoder, format, baseIRI, baseTriplestore) {
    return new Promise((resolve, reject) => {
        const parser = getParser(format, baseIRI);
        if (parser)
            parseDocument(inputStream, parser, decoder, format, true, null, new ts.Triplestore(), resolve, reject, baseTriplestore);
    })

}

function getParser(format, baseIRI) {
    let parser = null;
    switch (format) {
        case "application/rdf+xml":
            parser = new RdfXmlParser({
                baseIRI: baseIRI
            });
            break;
        case "application/ld+json":
            parser = new JsonLdParser({
                baseIRI: baseIRI
            });
            break;
        case "application/trig":
        case "application/n-quads":
        case "application/n-triples":
        case "text/nt":
        case "text/turtle":
        case "text/n3":
            parser = new N3Parser({
                baseIRI: baseIRI
            });
            break;
    }
    return parser;
}

function parseDocument(inputStream, parser, decoder, format, contentScript, baseIRI, store, resolve, reject, baseTriplestore = null) {
    const transformStream = new Transform({
        transform(chunk, encoding, callback) {
            this.push(chunk);
            callback();
        }
    });
    if (contentScript) {
        if (baseTriplestore === null)
            document.getElementById("status").innerText = "Status: fetching file...";
        inputStream.read().then(function processText({done, value}) {
            if (done)
                transformStream.push(null);
            else {
                handleInput(value, transformStream);
                inputStream.read().then(processText);
            }
        });
    } else {
        inputStream.onstop = () => {
            transformStream.push(null);
        };
        inputStream.ondata = event => {
            handleInput(event.data, transformStream);
        };
    }
    const outputStream = parser.import(transformStream);
    if (baseTriplestore === null) {
        let counter = 1;
        outputStream
            .on("context", context => {
                for (const prefix in context) {
                    if (typeof context[prefix] === "string")
                        store.addPrefix(prefix, context[prefix]);
                }
            })
            .on("data", triple => handleTriple(triple, counter))
            .on("prefix", (prefix, ns) => {
                if (typeof ns.value === "string" && /^http/.test(ns.value))
                    store.addPrefix(prefix, ns.value);
            })
            .on("error", error => {
                if (contentScript && baseTriplestore === null)
                    document.getElementById("status").innerText = "Status: parsing error: " + error
                        + " (see console for more details)";
                reject(error);
            })
            .on("end", () => {
                store.finalize();
                resolve(store);
            });
    } else {
        outputStream
            .on("data", handleMetaTriple)
            .on("end", resolve);
    }

    function processResource(store, resource) {
        const value = resource.value;
        const resourceType = Object.getPrototypeOf(resource).termType || resource.termType;
        if (!resourceType)
            return null;
        switch (resourceType) {
            case "BlankNode":
                return store.getBlankNode(value);
            case "NamedNode":
                return store.getURI(value);
            case "Literal":
                return store.getLiteral(value, resource.datatype.value, resource.language);
        }
        return null;
    }

    function handleInput(value, transformStream) {
        let data = decoder.decode(value, {stream: true});
        if (typeof data === "string")
            transformStream.push(data);
    }

    function handleTriple(triple, counter) {
        const subject = processResource(store, triple.subject);
        const predicate = processResource(store, triple.predicate);
        const object = processResource(store, triple.object);
        store.addTriple(subject, predicate, object);
        if (contentScript)
            document.getElementById("status").innerText = "Status: processing " + counter
                + " triples...";
        counter++;
    }

    function handleMetaTriple(triple) {
        const predicate = processResource(store, triple.predicate);
        if (!predicate instanceof rs.URI)
            return;
        const annotationPredicate = ts.getAnnotationPredicate(predicate.value);
        if (!annotationPredicate)
            return;
        const subject = processResource(store, triple.subject);
        const ref = baseTriplestore.uris[subject.value];
        if (typeof ref === "undefined")
            return;
        const object = processResource(store, triple.object);
        ref.annotate(annotationPredicate, object);
    }
}

module.exports = {obtainTriplestore, obtainDescriptions};
