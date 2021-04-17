const express = require('express');
const fetch = require("node-fetch");
const bodyParser = require('body-parser');
const process = require('child_process');
const fs = require('fs');

//process.execFileSync('./mkdirs.sh');

const app = express();
const jsonParser = bodyParser.json();
const SERVER_DIR = "public";
const PORT = 3000;
let performanceUriCount, conformanceUriCount = 0;
initialize()
    .then(() => setupServer())
    .catch(console.error);

async function initialize() {
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

