const sttl = require('sttl');
const urdf = require('urdf');

const tpl = `
prefix st: <http://ns.inria.fr/sparql-template/>
prefix : <https://vcharpenay.link/#>

template :main {
    "<!DOCTYPE html>"
    "<html>"
        "<head></head>"
        "<body>"
            "<table>"
                st:call-template(:table)
            "</table>"
        "</body>"
    "</html>"
} where {}

template :table {
    "<tr>"
        "<td>" st:call-template(:term, ?s) "</td>"
        "<td>" st:call-template(:term, ?p) "</td>"
        "<td>" st:call-template(:term, ?o) "</td>"
    "</tr>"
} where {
    ?s ?p ?o
}

template :term(?t) {
    if(isIRI(?t), st:call-template(:iri, ?t),
    if(isBlank(?t), st:call-template(:bnode, ?t),
    st:call-template(:literal, ?t)))
} where {}

template :iri(?iri) {
    format {
        "<a href=\\"%s\\">%s</a>"
        ?iri ?iri
    }
} where {}

template :bnode(?n) {
    format {
        "_:%s"
        ?n
    }
} where {}

template :literal(?lit) {
    format {
        "%s"
        ?lit
    }
} where {}
`;

sttl.register(tpl);
sttl.connect(q => urdf.query(q).then(b => ({ results: { bindings: b } })));

function render(data, format) {
    return urdf.clear()
        .then(() => urdf.load(data, { format: format }))
        .then(() => sttl.callTemplate('https://vcharpenay.link/#main'));
}

module.exports.render = render;