const defaultOptions = {
    json: true,
    n4: true,
    n3: true,
    xml: true,
    trig: true,
    ttl: true,
    xhr: true,
    maxsize: 10485760,
    allStyleTemplate: {
        monospace: {
            font: "\"Consolas\", monospace, sans-serif",
            fontsize: 11,
            spacing: 1.1,
            bgcolor: "#1E221D",
            uriStyle: "#D7F93B",
            uriBold: false,
            uriItalic: false,
            uriUnderline: true,
            uriUnderlineColor: "#9A9B9A",
            prefixStyle: "white",
            prefixBold: false,
            prefixItalic: false,
            prefixUnderline: true,
            prefixUnderlineColor: "#9A9B9A",
            curieStyle: "#EED22C",
            curieBold: false,
            curieItalic: false,
            curieUnderline: true,
            curieUnderlineColor: "#9A9B9A",
            bnStyle: "#9A9B9A",
            bnBold: false,
            bnItalic: false,
            bnUnderline: false,
            bnUnderlineColor: "#9A9B9A",
            litStyle: "#ADFF2F",
            litBold: false,
            litItalic: false,
            litUnderline: false,
            litUnderlineColor: "#9A9B9A"
        },
        plain: {
            font: "sans-serif",
            fontsize: 12,
            spacing: 1,
            bgcolor: "#1E221D",
            uriStyle: "#D7F93B",
            uriBold: false,
            uriItalic: false,
            uriUnderline: true,
            uriUnderlineColor: "#9A9B9A",
            prefixStyle: "white",
            prefixBold: false,
            prefixItalic: false,
            prefixUnderline: true,
            prefixUnderlineColor: "#9A9B9A",
            curieStyle: "#EED22C",
            curieBold: false,
            curieItalic: false,
            curieUnderline: true,
            curieUnderlineColor: "#9A9B9A",
            bnStyle: "#9A9B9A",
            bnBold: false,
            bnItalic: false,
            bnUnderline: false,
            bnUnderlineColor: "#9A9B9A",
            litStyle: "#ADFF2F",
            litBold: false,
            litItalic: false,
            litUnderline: false,
            litUnderlineColor: "#9A9B9A"
        },
        custom: {
            font: "\"Consolas\", monospace, sans-serif",
            fontsize: 11,
            spacing: 1.1,
            bgcolor: "#1E221D",
            uriStyle: "#D7F93B",
            uriBold: false,
            uriItalic: false,
            uriUnderline: true,
            uriUnderlineColor: "#9A9B9A",
            prefixStyle: "white",
            prefixBold: false,
            prefixItalic: false,
            prefixUnderline: true,
            prefixUnderlineColor: "#9A9B9A",
            curieStyle: "#EED22C",
            curieBold: false,
            curieItalic: false,
            curieUnderline: true,
            curieUnderlineColor: "#9A9B9A",
            bnStyle: "#9A9B9A",
            bnBold: false,
            bnItalic: false,
            bnUnderline: false,
            bnUnderlineColor: "#9A9B9A",
            litStyle: "#ADFF2F",
            litBold: false,
            litItalic: false,
            litUnderline: false,
            litUnderlineColor: "#9A9B9A"
        },
        selected: "monospace"
    }
};
let currentOptions;

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

    const getting = browser.storage.sync.get("options");
    getting.then(result => {
        if (result.options === undefined) {
            result = {
                options: defaultOptions
            };
            browser.storage.sync.set(result);
        }
        setCurrentChoice(result.options);
    });
}

function restoreDefault() {
    browser.storage.sync.set({
        options: defaultOptions
    });
    restoreOptions();
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
document.querySelector("form").addEventListener("reset", restoreOptions);
document.getElementById("restore").addEventListener("click", restoreDefault);
