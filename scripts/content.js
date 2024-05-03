// rebuild original method, because cannot access window.getNoCsrfToken() from content script
async function getNoCsrfToken() {
  const sessionhash = document.head.innerHTML.match(/sessionhash = "(.+?)";/)[1];
  const response = await fetch('nocsrf_ajax.php?action=getnocsrftoken', {
    method: 'POST',
    body: `sessionhash=${sessionhash}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
  })
  return await response.text();
}

// original method is showProductDetail(id)
async function getDomainFromProductDetail(id) {
  const response = await fetch('produkte_ajax.php?action=showProductDetail', {
    method: 'POST',
    body: `hosting_id=${id}&nocsrftoken=${await getNoCsrfToken()}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
  })
  const json = await response.json();
  if (!json.status) { return; }
  const domainsSelect = json.content.match(/<select id=\"pleskHostingDomainSelect\"(.+?)<\/select>/s);
  if (!domainsSelect || !domainsSelect[0]) {
    return json.content.match(/<h1>Verwaltung und Konfigurationen der Domain (.+)<\/h1>/)[1];
  }
  // get all domain names (value attribute does not matter)
  const domains = domainsSelect[0].match(/<option value=\"\d\">(.+?)<\/option>/gs).map((domain) => domain.match(/<option value=\"\d\">(.+?)<\/option>/)[1]);
  return domains.join(', ');
}

function setDomain(element, domain) {
  element.parentElement.parentElement.previousElementSibling.children[1].innerHTML = domain;
  element.domain = domain;
}

function init() {
  Array.from(document.body.getElementsByClassName('detailtab')).forEach((element, i) => {
    if (element.domain) { return; }

    chrome.storage.sync.get(element.id, (result) => {
      if (result[element.id]) { setDomain(element, result[element.id]); }
    });

    const id = parseInt(element.id.replace('produktdetails_', ''), 10);

    setTimeout(async () => {
      const domain = await getDomainFromProductDetail(id);
      setDomain(element, domain);
      chrome.storage.sync.set({ [element.id]: domain });
    }, i * 1500);
  });
}

// wait for page load
setTimeout(init, 1000);
