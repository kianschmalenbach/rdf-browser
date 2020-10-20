const pedanticURI = "https://aharth.inrupt.net/public/2020/pedanticweb/";

function reportDocument(url) {
    fetch(pedanticURI, {
        method: "POST",
        body: url
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
