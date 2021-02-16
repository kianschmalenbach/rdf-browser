function getStyleRule(stylesheet, styleClass) {
    for (let rule in stylesheet.cssRules) {
        if (stylesheet.cssRules[rule].cssText === undefined)
            continue;
        if (stylesheet.cssRules[rule].cssText.startsWith(styleClass))
            return stylesheet.cssRules[rule];
    }
    return null;
}

function setStyle() {
    browser.storage.sync.get("options").then(function (result) {
        const style = result.options.allStyleTemplate[result.options.allStyleTemplate.selected];
        applyStyle(style, true);
    });
}

function applyStyle(input, contentScript = false) {
    const stylesheet = document.styleSheets[0];
    for (const setting in input) {
        let styleValue = input[setting];
        let array = setting.split("_");
        if (typeof input[setting] === "boolean") {
            styleValue = styleValue ? array[array.length - 1] : "None";
            array.pop();
        }
        let styleClass = ".";
        if (array.length === 1) {
            if (array[0] === "backgroundColor" || setting + contentScript.toString() === "widthtrue")
                array = ["body", array[0]];
            else
                array = ["main", array[0]];
            styleClass = "";
        }
        styleClass += array[0];
        if (styleClass === ".aside")
            styleClass = "aside";
        else if (styleClass === ".header")
            styleClass = "header";
        const styleRule = getStyleRule(stylesheet, styleClass);
        if (styleRule === null)
            continue;
        const styleSetting = array[1];
        if (styleSetting === "fontSize")
            styleValue += "pt";
        if (setting + contentScript.toString() === "widthtrue") {
            getStyleRule(stylesheet, "main").style["width"] = "calc(" + parseInt(styleValue) * .80 + "% - 20px)";
            getStyleRule(stylesheet, "aside").style["width"] = "calc(" + parseInt(styleValue) * .20 + "% + 10px)";
            getStyleRule(stylesheet, "aside").style["right"] = "calc(" + ((100 - parseInt(styleValue)) / 2) + "%)";
        }
        styleRule.style[styleSetting] = styleValue;
    }
}

try {
    applyStyle(style);
} catch (e) {
    setStyle();
}
