let options;
let listStatus;
let baseURL;
let tab;

function initialize(url) {
    const urlString = url.protocol + "//" + url.host + url.pathname;
    const listArray = ["blacklist", "whitelist"];
    for (const list of listArray) {
        const arg = ["listStatus", list, urlString];
        browser.runtime.sendMessage(arg).then(result => {
            listStatus = result;
            if (listStatus.active) {
                const listName = list.charAt(0).toUpperCase() + list.slice(1);
                document.getElementById(list + "-box").setAttribute("class", list + "-active");
                document.getElementById(list + "-caption").innerText = "On " + listName;
                document.getElementById(list + "-url").setAttribute("disabled", "disabled");
                document.getElementById(list + "-action").innerText = "Remove";
                document.getElementById(list + "-action").focus();
                document.getElementById(list + "-suggestions").setAttribute("class", "hidden");
                document.getElementById(list + "-action").onclick = () => {
                    removeListEntry(list);
                };
                document.getElementById((list === listArray[0] ? listArray[1] : listArray[0]) + "-box").remove();
                document.getElementById("hint").innerText = "Remove the entry below from " + listName + ": Enter";
            } else if (document.getElementById(list + "-form") !== null) {
                document.getElementById(list + "-action").onclick = () => {
                    submitListEntry(list);
                };
                document.getElementById(list + "-url").onkeydown = (e) => {
                    if (e.key === 'Enter')
                        submitListEntry(list);
                    else
                        toggleListButton(list);
                };
            } else
                return;
            if (listStatus.active || listStatus.url === urlString)
                baseURL = listStatus.url;
            else
                baseURL = urlString;
            document.getElementById(list + "-url").value = baseURL;
            document.getElementById(list + "-page").addEventListener("click", () => togglePage(list + ""));
            document.getElementById(list + "-directory").addEventListener("click", () => toggleDirectory(list + ""));
            document.getElementById(list + "-domain").addEventListener("click", () => toggleDomain(list + ""));
            document.getElementById(list + "-subdomains").addEventListener("click", () => toggleSubdomains(list + ""));
        });
    }
}

function togglePage(list) {
    document.getElementById(list + "-url").value = baseURL;
    toggleListButton(list, "page");
}

function toggleDirectory(list) {
    const array = (baseURL.split("//"))[1].split("/");
    const length = array[array.length - 1].length;
    document.getElementById(list + "-url").value = baseURL.substring(0, baseURL.length - length) + "*";
    toggleListButton(list, "directory");
}

function toggleDomain(list) {
    const array = (baseURL.split("//"));
    document.getElementById(list + "-url").value = array[0] + "//" + (array[1].split("/"))[0] + "/*";
    toggleListButton(list, "domain");
}

function toggleSubdomains(list) {
    const array = (baseURL.split("//"));
    document.getElementById(list + "-url").value = array[0] + "//*." + (array[1].split("/"))[0] + "/*";
    toggleListButton(list, "subdomains");
}

function toggleListButton(list, button = null) {
    document.getElementById(list + "-page").removeAttribute("disabled");
    document.getElementById(list + "-page").setAttribute("class", "passive");
    document.getElementById(list + "-directory").removeAttribute("disabled");
    document.getElementById(list + "-directory").setAttribute("class", "passive");
    document.getElementById(list + "-domain").removeAttribute("disabled");
    document.getElementById(list + "-domain").setAttribute("class", "passive");
    document.getElementById(list + "-subdomains").removeAttribute("disabled");
    document.getElementById(list + "-subdomains").setAttribute("class", "passive");
    if (button !== null) {
        document.getElementById(list + "-" + button).setAttribute("disabled", "disabled");
        document.getElementById(list + "-" + button).setAttribute("class", "active");
    }
    document.getElementById(list + "-url").focus();
}

function submitListEntry(list) {
    options[list] += (options[list].length === 0 || options[list].endsWith('\n') ? "" : "\n") +
        document.getElementById(list + "-url").value;
    browser.storage.sync.set({
        options: options
    }).then(() => {
        browser.tabs.update(tab.id, {url: baseURL});
        window.close();
    });
}

function removeListEntry(list) {
    options[list] = options[list].replace(document.getElementById(list + "-url").value, "");
    options[list] = options[list].replace("\n\n", "\n");
    browser.storage.sync.set({
        options: options
    }).then(() => {
        browser.tabs.reload(tab.id);
        window.close();
    });
}

browser.storage.sync.get("options").then(result => {
    options = result.options;
    browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => {
            tab = tabs[0];
            let url = tab.url;
            if(url.startsWith("moz"))
                url = (tab.url.split('url=')[1]).split('&')[0];
            initialize(new URL(decodeURIComponent(url)))
        });
});
