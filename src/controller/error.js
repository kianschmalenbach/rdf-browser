const pedanticURI = "https://aharth.inrupt.net/public/2020/pedanticweb/";
let baseIRI = document.getElementById("url").getAttribute("href");
if (baseIRI === null) {
    baseIRI = new URLSearchParams(window.location.search).get('url');
    document.getElementById("url").setAttribute("href", baseIRI);
    document.getElementById("url").appendChild(document.createTextNode(baseIRI));
    const message = new URLSearchParams(window.location.search).get('message');
    document.getElementById("message").appendChild(document.createTextNode(message));
    document.getElementById("sources").remove();
}


function handleRefresh() {
    window.location.href = baseIRI;
}

function handleReport() {
    fetch(pedanticURI, {
        method: "POST",
        body: baseIRI
    })
        .then(success)
        .catch(failure);

    function success() {
        document.getElementById("report").setAttribute("disabled", "disabled");
        document.getElementById("report").innerText = "Reported successfully";
        document.getElementById("status").innerText = "Successfully reported this URI to " + pedanticURI;
    }

    function failure(error) {
        const textNode = document.createTextNode(error.toString());
        document.getElementById("status").appendChild(textNode);
    }
}

document.getElementById("refresh").addEventListener("click", handleRefresh);
document.getElementById("report").addEventListener("click", handleReport);
