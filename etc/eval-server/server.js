const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const jsonParser = bodyParser.json();
const SERVER_DIR = "public";
const PORT = 3000;

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

app.get('/', (req, res) => {
    res.send("success");
});

app.listen(PORT);
