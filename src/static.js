function onList(list, url, req = false) {
    list = options[list].split("\n");
    for (const listKey in list) {
        if (list[listKey].startsWith('#'))
            continue;
        const result = checkListMatch(list[listKey], list, url, req);
        if (result)
            return true;
    }
    return false;
}

function getListStatus(list, url) {
    list = options[list].split("\n");
    for (const entry in list) {
        let entryUrl = list[entry];
        const active = !list[entry].startsWith('#');
        if (!active)
            entryUrl = entryUrl.substring(1).replace(/\s/g, '');
        url = new URL(url);
        if (checkListMatch(entryUrl, list, url))
            return (
                {
                    url: entryUrl,
                    active: active
                });
    }
    return false;
}

function checkListMatch(input, list, url, req = false) {
    let entry, urlString;
    const hostArr = input.split("://");
    let hostWildcard = false, pathWildcard = false;
    if (input.length <= 1)
        return false;
    if (hostArr.length >= 1 && hostArr[1].startsWith("*.")) {
        urlString = hostArr[0] + "://" + hostArr[1].substring(2);
        hostWildcard = true;
    } else
        urlString = input;
    try {
        entry = new URL(urlString);
    } catch (e) {
        if (req)
            console.warn("Invalid URI in RDF-Browser " + list + ": " + input);
        return false;
    }
    const hostMatch = compareList(entry.host, url.host, ".", true, hostWildcard);
    let entryPath = entry.pathname;
    if (entryPath.endsWith("/*")) {
        pathWildcard = true;
        entryPath = entryPath.substring(0, entryPath.length - 2);
    }
    entryPath = entryPath.substring(1);
    const pathMatch = compareList(entryPath, url.pathname.substring(1), "/", false, pathWildcard);
    if (hostMatch && pathMatch)
        return true;

    function compareList(a, b, token, backwards, wildcard) {
        const as = a.split(token);
        const bs = b.split(token);
        if (as.length > bs.length)
            return false;
        if (as.length === 1 && as[0] === "" && bs[0] !== "")
            return wildcard;
        let aIndex = backwards ? as.length - 1 : 0;
        let bIndex = backwards ? bs.length - 1 : 0;
        for (let i = 0; i < as.length; ++i) {
            if (bs[bIndex] !== as[aIndex])
                return false;
            aIndex += (backwards ? -1 : 1);
            bIndex += (backwards ? -1 : 1);
        }
        return (bIndex === (backwards ? -1 : bs.length)) || wildcard;
    }
}
