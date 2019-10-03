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
        let bodyContent = "<p class='prefixes'>";
        store.prefixes.forEach(prefix => {
            bodyContent += prefix.representation + "<br>";
        });
        bodyContent += "</p><p class='triples'>";
        let subjectIndex = 0;
        while(subjectIndex < store.triples.length) {
            const result = writeTriple(store, subjectIndex, bodyContent);
            subjectIndex = result.subjectIndex;
            bodyContent = result.bodyContent;
        }
        bodyContent += "</p>";
        body.innerHTML = bodyContent;
        resolve(new XMLSerializer().serializeToString(document));
    });
}

function writeTriple(store, subjectIndex, bodyContent) {
    const subject = store.triples[subjectIndex].subject;
    bodyContent += "<p class='triple'><span class='subject' id='" + subject.value + "'>" + subject.representation + " ";
    const predicateList = store.getTriplesWithSameFieldAs(subjectIndex, "subject");
    let predicateIndex = 0;
    while (predicateIndex < predicateList.length) {
        const predicate = store.triples[predicateList[predicateIndex]].predicate;
        bodyContent += "<span class='predicate'>"
            + (predicateIndex === 0 ? "" : getIndent(subject.representationLength + 1))
            + predicate.representation + " ";
        const objectList = store.getTriplesWithSameFieldAs(predicateList[predicateIndex], "predicate",
            predicateList, predicateIndex);
        let objectIndex = 0;
        while (objectIndex < objectList.length) {
            const object = store.triples[objectList[objectIndex]].object;
            bodyContent += "<span class='object'>"
                + (objectIndex === 0 ? "" : getIndent(subject.representationLength
                    + predicate.representationLength + 2))
                + object.representation + "</span>";
            subjectIndex++;
            predicateIndex++;
            objectIndex++;
            bodyContent += (objectIndex < objectList.length) ? " ,<br>" : " ";
        }
        bodyContent += "</span>";
        bodyContent += (predicateIndex < predicateList.length) ? " ;<br>" : " ";
    }
    bodyContent += " .</span></p>";
    return {subjectIndex, bodyContent};

    function getIndent(spaces) {
        let output = "";
        for(let i=0; i<spaces; i++)
            output += "&nbsp;";
        return output;
    }
}

module.exports.render = render;
