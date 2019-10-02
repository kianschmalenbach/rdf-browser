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
                //console.log(quads);
                //console.log(prefixes);
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
        const result = {
            prefixes: [],
            triples: []
        };
        quads.forEach(quad => {
            const triple = [quad.subject, quad.predicate, quad.object];
            let output = "";
            triple.forEach(resource => {
                let value = resource.value;
                const resourceType = Object.getPrototypeOf(resource).termType;
                if(resourceType) {
                    switch(resourceType) {
                        case "BlankNode":
                            value = "_:" + value;
                            break;
                        case "NamedNode":
                            const link = "<a href='" + value + "'>";
                            const prefix = hasPrefix(value);
                            if(prefix) {
                                output.prefixes.push(prefix);
                                value.replace(prefix.uri, prefix.name + ":");
                            }
                            else {
                                value = "&lt;" + value + "&gt;";
                            }
                            value = link + value + "</a>";
                            break;
                        case "Literal":
                            value = "\"" + value + "\"";
                            if(resource.datatype) {
                                if(resource.language) {
                                    value += "@" + resource.language;
                                } else {
                                    value += "^^&lt;" + resource.datatype.value + "&gt;";
                                }
                            }
                    }
                }
                output += value + " ";
            });
            output += ".<br>";
            //console.log(output);
            result.triples.push(output);
        });
        resolve(result);
    });
}

function hasPrefix(uri, prefixes) {
    //TODO implement
    //returns false or { uri: "http://...", name: "name" }
    return false;
}

function createDocument(html, rdf, source) {
    return new Promise(resolve =>  {
        const document = new DOMParser().parseFromString(html, "text/html");
        const title = document.getElementById("title");
        const body = document.getElementById("body");
        title.innerText = source;
        let bodyContent = "";
        rdf.triples.forEach(triple => {
            bodyContent += triple;
        });
        body.innerHTML = bodyContent;
        resolve(new XMLSerializer().serializeToString(document));
    });
}

module.exports.render = render;
