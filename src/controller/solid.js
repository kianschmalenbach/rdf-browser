let oidcIssuer = 'https://solid.dschraudner.de/'
//let oidcIssuer = 'https://solidcommunity.net/'

document.getElementById('login').addEventListener('click', () => {
    browser.runtime.sendMessage(["solidLogin", oidcIssuer]).then(res => window.location.replace(res));
});

url = new URL(window.location.href);

if (url.searchParams.has('code')) {
    browser.runtime.sendMessage(["solidHandleIncomingRedirect", window.location.href]);
}