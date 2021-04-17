const express = require('express');
const fetch = require("node-fetch");
const bodyParser = require('body-parser');
const fs = require('fs');
//const process = require('child_process');

//process.execFileSync('./mkdirs.sh');

const app = express();
const jsonParser = bodyParser.json();
const SERVER_DIR = "public";
const PORT = 3000;
const mediaTypes = ["application/ld+json", "application/n-triples", "application/rdf+xml", "text/turtle", "text/n3"];
let performanceUriCount, conformanceUriCount = 0;

initializePerformanceTest()
    .then(() => initializeConformanceTest())
    .then(() => setupServer())
    .catch(console.error);

async function initializePerformanceTest() {
    return new Promise((resolve, reject) => {
        fs.readFile(SERVER_DIR + '/performance-uris.json', (err, data) => handleFile(err, data, resolve, reject));
    });

    async function handleFile(err, data, resolve, reject) {
        if (err)
            reject(err);
        const uris = JSON.parse(data.toString());
        performanceUriCount = uris.length;
        await fs.promises.rmdir(SERVER_DIR + "/performance/", {recursive: true});
        await fs.promises.mkdir(SERVER_DIR + "/performance/");
        await fs.promises.mkdir(SERVER_DIR + "/performance/upload");
        for (let i = 1; i <= uris.length; ++i) {
            const uri = uris[i - 1];
            console.log("Querying URI " + i + " of " + performanceUriCount + ": " + uri);
            try {
                await fetchURI(uri, "text/turtle", SERVER_DIR + "/performance/" + i + ".ttl");
                await fetchURI(uri, "text/html", SERVER_DIR + "/performance/" + i + ".html");
            } catch (error) {
                reject(error);
            }
        }
        resolve();
    }

    async function fetchURI(uri, contentType, path) {
        const resp = await fetch(uri, {
            headers: {
                'Accept': contentType
            }
        });
        if (!resp.ok)
            throw new Error(resp.statusText);
        const text = await resp.text();
        fs.writeFile(path, text, err => {
            if (err)
                throw new Error(err.message);
        });
    }
}

async function initializeConformanceTest() {
    await fs.promises.rmdir(SERVER_DIR + "/conformance/", {recursive: true});
    await fs.promises.mkdir(SERVER_DIR + "/conformance/");
    await fs.promises.mkdir(SERVER_DIR + "/conformance/upload");
    const lodFile = await fetch("https://lod-cloud.net/lod-data.json");
    const htmlFile = await fetch("https://moz.com/top-500/download/?table=top500Domains");
    const lod = await lodFile.json();
    const html = (await htmlFile.text()).split("\n");
    const LDuris = {};
    const HTMLuris = {};
    console.log("Retrieving LOD files for conformance analysis...");
    for (const entry in lod) {
        if (!lod[entry].hasOwnProperty("example") || lod[entry].example.length === 0 ||
            !lod[entry].example[0].hasOwnProperty("access_url") || !lod[entry].example[0].hasOwnProperty("media_type"))
            continue;
        const uri = lod[entry].example[0].access_url;
        const mediaType = lod[entry].example[0].media_type;
        if (!mediaTypes.includes(mediaType))
            continue;
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 5000);
            const response = await fetch(uri, {
                'Accept': "application/ld+json;q=1,application/n-triples;q=1,application/rdf+xml;q=1,text/turtle;q=1,text/n3;q=1",
                signal: controller.signal
            });
            if (!response.ok)
                continue;
            const contentType = (response.headers.get("Content-Type").split(";"))[0];
            if (!mediaTypes.includes(contentType))
                continue;
            LDuris[entry] = {uri: uri, contentType: contentType};
        } catch (error) {
        }
    }
    fs.writeFile(SERVER_DIR + "/conformance/ld.json", JSON.stringify(LDuris), err => {
        if (err)
            console.error(err)
    });
    console.log("Retrieving HTML files for conformance analysis...");
    let i = -1;
    for (const entry of html) {
        ++i;
        if (i === 0)
            continue;
        if (i > 100)
            break;
        const array = entry.split(",");
        try {
            const name = array[1].replaceAll("\"", "");
            HTMLuris[name] = "http://" + name + "/";
        } catch (error) {
        }
    }
    fs.writeFile(SERVER_DIR + "/conformance/html.json", JSON.stringify(HTMLuris), err => {
        if (err)
            console.error(err)
    });
}

function setupServer() {
    app.use('/c', express.static(SERVER_DIR + '/conformance'));
    app.use('/p', express.static(SERVER_DIR + '/performance'));

    function handlePut(req, res, path) {
        const body = req.body;
        if (!body) {
            res.sendStatus(400);
            return;
        }
        const filename = req.url.substr(2);
        fs.writeFile(SERVER_DIR + path + filename, JSON.stringify(req.body), err => {
            if (err)
                console.error(err)
        });
        res.sendStatus(200);
    }

    app.put('/c/*', jsonParser, (req, res) => {
        handlePut(req, res, "/conformance/upload");
    });

    app.put('/p/*', jsonParser, (req, res) => {
        handlePut(req, res, "/performance/upload");
    });

    app.get('/c/*', (req, res) => {

    });

    app.get('/', (req, res) => {
        res.send("success");
    });

    app.listen(PORT);
    console.log("Server listening on port " + PORT);
}

