const formats = require("@rdfjs/formats-common");
const RdfXmlParser = require("rdfxml-streaming-parser").RdfXmlParser;
const Readable = require("stream").Readable;
const templatePath = "src/template.html";

async function render(data, format, source) {
    const template = await getTemplate();
    const rawRdf = await parseData(data, format);
    const processedRdf = await processRdf(rawRdf);
    return createDocument(template, processedRdf, source);
}

function getTemplate() {
    return new Promise(resolve => {
        fetch(templatePath)
            .then(file => {
                return file.text();
            })
            .then(text => {
                resolve(text);
            })
    });
}

function parseData(data, format) {
    return new Promise((resolve, reject) => {
        let parser;
        if(format === "application/rdf+xml") {
            parser = new RdfXmlParser();
        }
        else {
            const readable = new Readable({
                read: () => {
                    readable.push(data);
                    readable.push(null);
                }
            });
            parser = formats.parsers.import(format, readable);
        }
        if(!parser) {
            reject("Unsupported format");
        }
        const quads = [];
        const prefixes = [];
        parser
            .on("data", quad => {
                quads.push(quad);
            })
            .on("prefix", (prefix, ns) => {
                prefixes.push([prefix, ns]);
            })
            .on("error", error => {
                reject(error);
            })
            .on("end", () => {
                console.log(quads);
                console.log(prefixes);
                resolve([quads, prefixes]);
            });
        if(format === "application/rdf+xml") {
            parser.write(data);
            parser.end();
        }
    });
}

function processRdf(rdf) {
    return new Promise(resolve => {
        const quads = rdf[0];
        const prefixes = rdf[1];
        resolve("This document type is not supported yet."); //TODO implement
    });
}

function createDocument(html, rdf, source) {
    return new Promise(resolve =>  {
        const document = new DOMParser().parseFromString(html, "text/html");
        const title = document.getElementById("title");
        const body = document.getElementById("body");
        title.innerText = source;
        body.innerHTML = "<p>" + rdf + "</p>"; //TODO implement properly
        resolve(new XMLSerializer().serializeToString(document));
    });
}

module.exports.render = render;
