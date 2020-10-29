const RdfXmlParser = require("rdfxml-streaming-parser").RdfXmlParser;
const JsonLdParser = require("jsonld-streaming-parser").JsonLdParser;
const N3Parser = require("@rdfjs/parser-n3");
const Transform = require("stream").Transform;
const ts = require("../bdo/triplestore");
const rs = require("../bdo/resource");

function obtainTriplestore(inputStream, decoder, format, contentScript, baseIRI, baseTriplestore = null) {
    return new Promise((resolve, reject) => {
        const parser = getParser(format, baseIRI);
        if (!parser)
            reject("Unsupported format");
        ts.getTriplestore(contentScript).then(store => {
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
            let counter = 1;
            outputStream
                .on("context", context => {
                    for (const prefix in context) {
                        if (typeof context[prefix] === "string")
                            store.addPrefix(prefix, context[prefix]);
                    }
                })
                .on("data", handleTriple(store, counter))
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
        });
    });

    function handleInput(value, transformStream) {
        let data = decoder.decode(value, {stream: true});
        if (typeof data === "string")
            transformStream.push(data);
    }

    function handleTriple(store, counter) {
        return triple => {
            const predicate = processResource(store, triple.predicate);
            if (baseTriplestore !== null) {
                if (!predicate instanceof rs.URI || !ts.isAnnotationPredicate(predicate.value))
                    return;
                const subject = processResource(store, triple.subject);
                const ref = baseTriplestore.uris[subject.value];
                if (typeof ref === "undefined")
                    return;
                const object = processResource(store, triple.object);
                ref.annotate(predicate.value, object);
            } else {
                const subject = processResource(store, triple.subject);
                const object = processResource(store, triple.object);
                store.addTriple(subject, predicate, object);
                if (contentScript)
                    document.getElementById("status").innerText = "Status: processing " + counter
                        + " triples...";
                counter++;
            }
        };
    }
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

module.exports = {obtainTriplestore};
