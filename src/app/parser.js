const RdfXmlParser = require("rdfxml-streaming-parser").RdfXmlParser;
const JsonLdParser = require("jsonld-streaming-parser").JsonLdParser;
const ParserN3 = require("@rdfjs/parser-n3");
const N3Parser = require('n3').Parser;
const Transform = require("stream").Transform;
const ts = require("../bdo/triplestore");

function obtainTriplestore(inputStream, redirect, decoder, format, contentScript, baseIRI) {
    return new Promise((resolve, reject) => {
        const parser = getParser(format, baseIRI);
        if (!parser)
            reject("Unsupported format");
        ts.getTriplestore(baseIRI, contentScript).then(store => {
            parseDocument(inputStream, parser, decoder, format, contentScript, redirect, baseIRI, store, resolve, reject);
        });
    });
}

function obtainDescriptions(inputStream, decoder, format, baseIRI, store, baseTriplestore) {
    return new Promise((resolve, reject) => {
        const parser = getParser(format, baseIRI);
        if (parser)
            parseDocument(inputStream, parser, decoder, format, true, false, null, store, resolve, reject, baseTriplestore);
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
            parser = new ParserN3({
                baseIRI: baseIRI
            });
            break;
    }
    return parser;
}

function parseDocument(inputStream, parser, decoder, format, contentScript, redirect, baseIRI, store, resolve, reject, baseTriplestore = null) {
    const transformStream = new Transform({
        transform(chunk, encoding, callback) {
            this.push(chunk);
            callback();
        }
    });
    if (contentScript || redirect) {
        if (contentScript && baseTriplestore === null)
            document.getElementById("status").innerText = "fetching file...";
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
        .on("data", triple => {
            if (baseTriplestore === null)
                handleTriple(triple, counter++);
            else
                handleMetaTriple(triple);
        })
        .on("prefix", (prefix, ns) => {
            if (typeof ns.value === "string" && /^http/.test(ns.value))
                store.addPrefix(prefix, ns.value);
        })
        .on("error", error => {
            if (contentScript && baseTriplestore === null)
                document.getElementById("status").innerText = "parsing error: " + error
                    + " (see console for more details)";
            reject(error);
        })
        .on("end", () => {
            store.finalize(contentScript);
            resolve(store);
        });

    function processResource(store, resource, uriOnly = false) {
        const value = resource.value;
        const resourceType = Object.getPrototypeOf(resource).termType || resource.termType;
        if (!resourceType || (uriOnly && resourceType !== "NamedNode"))
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
            document.getElementById("status").innerText = "processing " + counter
                + " triple(s)...";
    }

    function handleMetaTriple(triple) {
        const subject = processResource(store, triple.subject, true);
        if (subject === null)
            return;
        for (const u in baseTriplestore.uris) {
            if (u === subject.value) {
                const predicate = processResource(store, triple.predicate);
                const object = processResource(store, triple.object);
                const subjectItem = store.addTriple(subject, predicate, object);
                if (subjectItem !== null)
                    baseTriplestore.uris[u].addSubject(subjectItem);
            }
        }
    }
}

function validateTurtle(turtleString, baseIRI) {
    const parser = new N3Parser({
        baseIRI: baseIRI
    });
    try {
        parser.parse(turtleString);
        return null;
    } catch (e) {
        return e;
    }
}

module.exports = {obtainTriplestore, obtainDescriptions, validateTurtle};
