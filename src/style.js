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
        applyStyle(style);
    });
}

function applyStyle(input) {
    const stylesheet = document.styleSheets[0];
    for (const setting in input) {
        let styleValue = input[setting];
        let array = setting.split("_");
        if (typeof input[setting] === "boolean") {
            styleValue = styleValue ? array[array.length - 1] : "None";
            array.pop();
        }
        if (array.length === 1)
            array = ["body", array[0]];
        const styleClass = (array[0] !== "body" ? "." : "") + array[0];
        const styleRule = getStyleRule(stylesheet, styleClass);
        if (styleRule === null)
            continue;
        const styleSetting = array[1];
        if (styleSetting === "fontSize")
            styleValue += "pt";
        styleRule.style[styleSetting] = styleValue;
    }
}

try {
    applyStyle(style);
} catch (e) {
    setStyle();
}
