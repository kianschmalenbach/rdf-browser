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
        light: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#FFFFFF",
            fontFamily: "\"Consolas\", monospace, sans-serif",
            fontSize: 11,
            lineHeight: 1.1,
            color: "#000000",
            uri_color: "#2806C4",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#656465",
            prefixName_color: "#000000",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#656465",
            postfix_color: "#112DD3",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#656465",
            blankNode_color: "#656465",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#656465",
            literal_color: "#5200D0",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: true,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#656465"
        },
        dark: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#1E221D",
            fontFamily: "\"Consolas\", monospace, sans-serif",
            fontSize: 11,
            lineHeight: 1.1,
            color: "#FFFFFF",
            uri_color: "#D7F93B",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#9A9B9A",
            prefixName_color: "#FFFFFF",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#9A9B9A",
            postfix_color: "#EED22C",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#9A9B9A",
            blankNode_color: "#9A9B9A",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#9A9B9A",
            literal_color: "#ADFF2F",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: true,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#9A9B9A"
        },
        plain: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#FFFFF",
            fontFamily: "serif",
            fontSize: 12,
            lineHeight: 1.0,
            color: "#000000",
            uri_color: "#0000FF",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#0000FF",
            prefixName_color: "#0000FF",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#0000FF",
            postfix_color: "#0000FF",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#0000FF",
            blankNode_color: "#000000",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#000000",
            literal_color: "#000000",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: false,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#000000"
        },
        custom: {
            width: "99%",
            whiteSpace_nowrap: true,
            backgroundColor: "#1E221D",
            fontFamily: "\"Consolas\", monospace, sans-serif",
            fontSize: 11,
            lineHeight: 1.1,
            color: "#FFFFFF",
            uri_color: "#D7F93B",
            uri_fontWeight_bold: false,
            uri_fontStyle_italic: false,
            uri_textDecoration_underline: true,
            uri_textDecorationColor: "#9A9B9A",
            prefixName_color: "#FFFFFF",
            prefixName_fontWeight_bold: false,
            prefixName_fontStyle_italic: false,
            prefixName_textDecoration_underline: false,
            prefixName_textDecorationColor: "#9A9B9A",
            postfix_color: "#EED22C",
            postfix_fontWeight_bold: false,
            postfix_fontStyle_italic: false,
            postfix_textDecoration_underline: true,
            postfix_textDecorationColor: "#9A9B9A",
            blankNode_color: "#9A9B9A",
            blankNode_fontWeight_bold: false,
            blankNode_fontStyle_italic: false,
            blankNode_textDecoration_underline: false,
            blankNode_textDecorationColor: "#9A9B9A",
            literal_color: "#ADFF2F",
            literal_fontWeight_bold: false,
            literal_fontStyle_italic: false,
            literal_textDecoration_underline: false,
            literal_textDecorationColor: "#9A9B9A"
        },
        selected: "light"
    }
};
let currentOptions;

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

function restoreOptions(e = null, display = true) {
    if (e !== null)
        e.preventDefault();
    const getting = browser.storage.sync.get("options");
    getting.then(result => {
        if (result.options === undefined) {
            result = {
                options: defaultOptions
            };
            browser.storage.sync.set(result);
        }
        if (display)
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

restoreOptions(null, false);
