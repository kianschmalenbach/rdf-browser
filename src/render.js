const templatePath = "src/template.html";
const parser = require("./parser");

async function render(data, format, source) {
    const template = await getTemplate();
    const triplestore = await parser.obtainTriplestore(data, format);
    return createDocument(template, triplestore, source);
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

function createDocument(html, store, source) {
    return new Promise(resolve =>  {
        const document = new DOMParser().parseFromString(html, "text/html");
        const title = document.getElementById("title");
        const body = document.getElementById("body");
        title.innerText = source;
        let bodyContent = "<p>";
        store.prefixes.forEach(prefix => {
            bodyContent += prefix.representation + "<br>";
        });
        bodyContent += "</p><p>";
        store.triples.forEach(triple => {
            bodyContent += triple.subject.representation + " " + triple.predicate.representation + " "
                + triple.object.representation + " .<br>";
        });
        bodyContent += "</p>";
        body.innerHTML = bodyContent;
        resolve(new XMLSerializer().serializeToString(document));
    });
}

module.exports.render = render;
