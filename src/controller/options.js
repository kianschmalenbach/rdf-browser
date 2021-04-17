let defaultOptions;
let currentOptions;

function initCollapsible() {
    const collapsible = document.querySelectorAll("h1");
    for (let i = 0; i < collapsible.length; ++i)
        collapsible[i].addEventListener("click", e => expand(e.target));
}

function expand(element) {
    const elements = document.querySelectorAll("h1");
    for (let i = 0; i < elements.length; ++i) {
        const el = elements[i];
        if (el !== element) {
            el.nextElementSibling.setAttribute("hidden", "true");
            el.setAttribute("class", "collapsed");
        } else {
            el.nextElementSibling.removeAttribute("hidden");
            el.setAttribute("class", "expanded");
        }
    }
}

function setCurrentChoice(input = currentOptions, scope = defaultOptions) {
    if (scope === defaultOptions)
        currentOptions = input;
    for (let setting in scope) {
        let all = false;
        const settingName = setting;
        const value = input[setting];
        if (setting.startsWith("all")) {
            all = true;
            setting = setting.substring(3);
            setting = setting[0].toLowerCase() + setting.substring(1);
        }
        const element = document.getElementById(setting);
        if (element === null || value === undefined)
            continue;
        if (all) {
            if (typeof value !== "object")
                continue;
            while (element.firstChild)
                element.removeChild(element.firstChild);
            let selectedOption = null;
            for (const entry in value) {
                if (entry === "selected")
                    continue;
                const option = document.createElement("option");
                option.setAttribute("value", entry);
                option.appendChild(document.createTextNode(entry));
                element.appendChild(option);
                if (value.selected === entry) {
                    selectedOption = value[entry];
                    element.value = entry;
                }
            }
            setCurrentChoice(selectedOption, selectedOption);
            const listener = () => {
                const options = currentOptions[settingName][element.options[element.selectedIndex].value];
                setCurrentChoice(options, options);
            };
            element.addEventListener("change", listener);
            const dependeeList = document.querySelectorAll("*[dependsOn='" + setting + "']");
            for (let i = 0; i < dependeeList.length; ++i) {
                dependeeList[i].addEventListener("change", () => {
                    element.value = "custom";
                });
            }
        } else if (element.hasAttribute("type") &&
            element.getAttribute("type").toLowerCase() === "checkbox") {
            if (value !== true && value !== false)
                continue;
            element.checked = input[setting];
        } else {
            element.value = input[setting];
        }
    }
}

function saveOptions(e = null, cursor = null) {
    if (e !== null)
        e.preventDefault();
    for (let setting in (cursor !== null ? cursor : currentOptions)) {
        let all = false;
        const settingName = setting;
        if (setting.startsWith("all")) {
            all = true;
            setting = setting.substring(3);
            setting = setting[0].toLowerCase() + setting.substring(1);
        }
        const element = document.getElementById(setting);
        if (element === null)
            continue;
        if (all) {
            currentOptions[settingName].selected = element.value;
            if (element.value === "custom")
                saveOptions(null, currentOptions[settingName].custom);
            continue;
        }
        let value = element.value;
        if (element.hasAttribute("type") &&
            element.getAttribute("type").toLowerCase() === "checkbox")
            value = element.checked;
        else if (element.hasAttribute("type") &&
            element.getAttribute("type").toLowerCase() === "number") {
            if (element.hasAttribute("step") && parseInt(element.getAttribute("step")) === 0)
                value = parseFloat(element.value);
            else
                value = parseInt(element.value);
        }
        (cursor !== null ? cursor : currentOptions)[setting] = value;
    }
    if (cursor !== null)
        return;
    browser.storage.sync.set({
        options: currentOptions
    });
}

function restoreOptions(e = null) {
    if (e !== null)
        e.preventDefault();
    browser.runtime.sendMessage("defaultOptions").then(defaults => {
        defaultOptions = defaults;
        const getting = browser.storage.sync.get("options");
        getting.then(result => {
            if (result.options === undefined) {
                result = {
                    options: defaultOptions
                };
                browser.storage.sync.set(result);
            }
            setCurrentChoice(result.options);
            toggleStyleSelection();
        });
    });
}

function restoreDefault() {
    browser.storage.sync.clear().then(restoreOptions());
}

function toggleStyleSelection() {
    const selector = document.getElementById("styleTemplate");
    const elements = document.querySelectorAll("*[dependsOn='styleTemplate']");
    for (let i = 0; i < elements.length; ++i) {
        if (selector.value === "none")
            elements[i].setAttribute("disabled", "true");
        else
            elements[i].removeAttribute("disabled");
    }
}

function startEvaluation() {
    document.getElementById("startEvaluation").setAttribute("disabled", "disabled");
    const uri = document.getElementById("evaluationURI").value;
    fetch(uri).then(res => {
        if (res.status !== 200) {
            alert("Error: " + res.statusText);
        } else {
            alert("Evaluation started successfully. Please wait until it is finished.");
            browser.runtime.sendMessage(["evaluation", uri, false, true]).then(); //TODO checkboxes
        }
    }).catch(error => {
        alert("Error: " + error.message);
    }).finally(() => {
        document.getElementById("startEvaluation").removeAttribute("disabled");
    });
}

document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("form").addEventListener("reset", restoreOptions);
document.getElementById("restore").addEventListener("click", restoreDefault);
document.getElementById("styleTemplate").addEventListener("change", toggleStyleSelection);
document.getElementById("startEvaluation").addEventListener("click", startEvaluation);
initCollapsible();
restoreOptions();
