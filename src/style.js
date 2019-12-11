function getStyleRule(stylesheet, styleClass) {
    for (let rule in stylesheet.cssRules) {
        if (stylesheet.cssRules[rule].cssText === undefined)
            continue;
        if (stylesheet.cssRules[rule].cssText.startsWith(styleClass))
            return stylesheet.cssRules[rule];
    }
    return null;
}

browser.storage.sync.get("options").then(result => {
    const style = result.options.allStyleTemplate[result.options.allStyleTemplate.selected];
    const stylesheet = document.styleSheets[0];
    for (const setting in style) {
        let styleValue = style[setting];
        let array = setting.split("_");
        if (typeof style[setting] === "boolean") {
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
});
