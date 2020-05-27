/* -------------------------------------------------------------------------- */
/*                              Document Helpers                              */
/* -------------------------------------------------------------------------- */

function toggle(id, name, force = null) {
    let element = document.getElementById(id);
    if (force === 'on') {
        element.classList.add(name);
    }
    else if (force === 'off') {
        element.classList.remove(name);
    }
    else {
        element.classList.toggle(name);
    }
}

let page = {
    mapView: document.getElementById('Map'),
    map: null,

    info: document.getElementById('Info'),
    infoList: document.getElementById('InfoList'),

    webView: document.getElementById('WebView'),
    webViewExternal: document.getElementById('WebViewExternal'),

    details: document.getElementById('Details'),

    filterInput: document.getElementById('FilterInput'),
}

let args = {
    apiKey: "AIzaSyBUO98uUcoliYiI8OZfBF8xMMEqdu2oje8",
    centerLocation: { lat: 47.58381, lng: 237.80868 },
    sheetURL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRj14jquvIrTJ6j_-uc4myv0dOaMCYegcAeqhQVL0EA4370K3bLzZj8Vv3lJ8JRef9RgDMC_kwtqunp/pub?output=tsv",
}

function parseArguments() {
    var url = new URLSearchParams(window.location.search);
    if (url.has('sheet')) { args.sheetURL = url.get('sheet'); }
    if (url.has('lat')) { args.lat = parseFloat(url.get('lat')); }
    if (url.has('lng')) { args.lng = parseFloat(url.get('lng')); }
    if (url.has('key')) { args.apiKey = url.get('key'); }
}

function onFilterChanged() {
    let text = page.filterInput.value;
    if (text === "") {
        console.log(`Use filter: true`);
        filterInfoList("true");
    }
    else {
        text = text.replace(/=/, "==");
        text = text.replace(/\band\b/, "&&");
        text = text.replace(/\bor\b/, "||");
        try {
            console.log(`Use filter: ${text}`);
            filterInfoList(text);
        }
        catch
        {
            console.log(`Invalid filter: ${text}`);
        }
    }
}
page.filterInput.addEventListener('input', onFilterChanged);

/* -------------------------------------------------------------------------- */
/*                               Data Management                              */
/* -------------------------------------------------------------------------- */

let data = {
    items: [
        // {
        //     name: "AVA Esterra Park",
        //     address: "15301 NE Turing St, Redmond, WA 98052",
        //     beds: "2",
        //     rent: "500",
        //     area: "1140",
        //     rentperarea: "13",
        //     link: "http://google.com",
        // },
        // {
        //     name: "AVA Esterra Park",
        //     address: "15301 NE Turing St, Redmond, WA 98052",
        //     beds: "2",
        //     rent: "5002",
        //     area: "1140",
        //     rentperarea: "132",
        //     link: "https://easings.net/en#easeOutExpo",
        // },
        // {
        //     name: "Foo 1 asd a d",
        //     rent: "3",
        //     rent: "5100",
        //     area: "1130",
        //     rentperarea: "12",
        //     link: "https://www.quora.com/How-do-you-type-a-%C2%B2-squared-symbol",
        // },
        // {
        //     name: "Foo 2 AD w e q",
        //     rent: "2",
        //     rent: "2500",
        //     area: "0",
        //     rentperarea: "1222",
        //     link: "https://loremipsum.io/generator/?n=5&t=p",
        // },
        // {
        //     name: "Foo 3 DDd Aa dDD",
        //     rent: "1",
        //     rent: "5020",
        //     area: "140",
        //     rentperarea: "122",
        //     link: "https://github.com/SomMeri/less4j/wiki/Less-Language-Namespaces",
        // },
    ]
}

function loadData() {
    console.log("Loading data");
    fetch(args.sheetURL, { cache: 'no-store' }).then(res => res.blob()).then(blob => {
        blob.text().then(text => {
            parseData(text)
            onDataLoaded()
        })
    })
}

const skip_count = 1;
function parseData(text) {
    console.log("Parsing data");

    // Split the text into lines, then split lines into entries
    let lines = text.split('\n')
    for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].split('\t')
    }
    if (lines.length == 0) {
        console.log("No data to parse")
    }

    let headerRow = lines[skip_count]
    for (var i = 0; i < headerRow.length; i++) {
        headerRow[i] = headerRow[i].toLowerCase().trim()
    }

    for (var i = 1 + skip_count; i < lines.length; i++) {
        let line = lines[i]
        var entry = {}

        let count = headerRow.length < line.length ? headerRow.length : line.length
        for (var j = 0; j < count; j++) {
            entry[headerRow[j]] = line[j].trim()
        }

        let makeNumber = (k) => {
            entry['text_' + k] = entry[k];
            entry[k] = parseFloat(entry[k].replace("$", "").replace(",", ""));
        };

        makeNumber('bedrooms');
        makeNumber('rent');
        makeNumber('area');
        makeNumber('rentperarea');
        makeNumber('impression');
        makeNumber('impressionperrent');
        makeNumber('bustime');
        makeNumber('cartime');
        makeNumber('nearbystuff');
        makeNumber('scenery');
        makeNumber('lat');
        makeNumber('lng');

        if (entry.name == "") {
            entry.name = `🏦 ${i + 1}`;
        }

        data.items.push(entry)
    }
}

function onDataLoaded() {
    populateInfoList();
    initializeMarkers();
}

/* -------------------------------------------------------------------------- */
/*                                 Interaction                                */
/* -------------------------------------------------------------------------- */

let templates = {
    item:
        `
        <div class='Heading'>
            <div class='Name'><span class='Link'>🔗 $name</span></div>
            <div class='Address'>$address </div>
        </div>
        <div class='Line'>
            <div class='BedRooms'>$text_bedrooms bed</div>
            <div class="Spacer"></div>
            <div class='Rent'>$text_rent</div>
            <div class="Spacer"></div>

            <div class='Area'>$text_area ft²</div>
            <div class="Spacer"></div>
            <div class='RentPerArea'>$text_rentperarea/ft²</div>
            <div class="Spacer"></div>
            
            <div class='Impression'>$text_impression*</div>
            <div class="Spacer"></div>
            <div class='ImpressionPerRent'>$text_impressionperrent*/$</div>
            </div>
        <div class='Line'>
            <div class='BusTime'>$text_bustime</div>/<div class='CarTime'>$text_cartime</div>m
            <div class="Spacer"></div>
            <div class='NearbyStuff'>nearby: $text_nearbystuff</div>
            <div class="Spacer"></div>
            <div class='Scenery'>scenery: $text_scenery</div>
        </div>
    `
}

function populateInfoList() {
    let i = 0;
    data.items.forEach((item) => {
        let result = templates.item;
        for (k in item) {
            let v = item[k];
            if (v === "") {
                v = "?";
            }
            result = result.replace(`$${k}`, v);
        }

        let newElement = document.createElement('div');
        newElement.classList.add('Item');
        newElement.innerHTML = result;

        newElement.tabIndex = i;
        i++;

        let target = item;
        newElement.getElementsByClassName('Link')[0].onclick = (event) => {
            if (item.previewing) {
                unpreviewItem(item)
            }
            else {
                previewItem(item);
                if (item.selected) {
                    showMarker(item);
                }
            }
            event.stopPropagation();
        };
        newElement.onclick = (event) => {
            if (isSelected(item)) {
                deselectItem(item);
            }
            else {
                selectItem(item);
            }
        };

        page.infoList.appendChild(newElement);
        item.element = newElement;
        item.selected = false;
    });
}

function isSelected(item) {
    return item.selected;
}

function selectItem(item) {

    if (!item.selected) {
        showMarker(item);
    }

    item.selected = true;
    item.element.classList.add('Selected');
}

function deselectItem(item) {
    item.selected = false;
    item.element.classList.remove('Selected');

    hideMarker(item);
}

function selectAll(value) {
    if (value) {
        data.items.forEach((item) => { selectItem(item) });
    }
    else {
        data.items.forEach((item) => { deselectItem(item) });
    }
}

let lastPreviewItem = null;
function previewItem(item) {
    item.previewing = true;
    item.element.classList.add('Previewing');

    toggle('Details', 'Hidden', 'off');
    if (item != lastPreviewItem) {
        if (lastPreviewItem != null) {
            lastPreviewItem.previewing = false;
            lastPreviewItem.element.classList.remove('Previewing');
        }

        lastPreviewItem = item;
        loadWebViewPage(item.link);
    }
}
function unpreviewItem(item) {
    item.previewing = false;
    item.element.classList.remove('Previewing');

    if (item == lastPreviewItem) {
        toggle('Details', 'Hidden', 'on');
    }
}

function focusItem(item) {
    let y = item.element.offsetTop - page.infoList.offsetTop;
    page.infoList.scrollTo({ top: y, behavior: 'smooth' });

    setTimeout(() => { item.element.focus({preventScroll: true}); }, 1);
}

function sortInfoList(key, reverse) {
    let ordering = 1;
    if (reverse) {
        ordering = -1;
    }

    data.items.forEach((item) => {
        let x = 0;
        if (isNaN(item[key])) {
            x = 999999999;
        }
        else {
            x = ordering * Math.floor(item[key] * 100);
        }
        item.element.style = `order: ${x};`
    });

    page.infoList.setAttribute('sort', key);
}

function filterInfoList(expression) {
    data.items.forEach((x) => {
        let result = eval(expression);
        if (result) {
            x.element.style.display = 'unset';
            if (x.selected) {
                showMarker(x);
            }
        }
        else {
            x.element.style.display = 'none';
            hideMarker(x);
        }
    });
}

/* -------------------------------------------------------------------------- */
/*                                  Map Stuff                                 */
/* -------------------------------------------------------------------------- */

function loadMap() {
    console.log(`Loading Map (api key=${args.apiKey})`);

    if (args.apiKey != "") {
        let scriptURL = `https://maps.googleapis.com/maps/api/js?key=${args.apiKey}&callback=initializeMap`;

        let loader = document.createElement('script');
        loader.setAttribute('src', scriptURL);
        loader.setAttribute('async', "");
        loader.setAttribute('defer', "");

        page.mapView.appendChild(loader);
    }
}

function initializeMap() {
    console.log("Creating Map");
    page.map = new google.maps.Map(page.mapView, { center: args.centerLocation, zoom: 13 });
}

function initializeMarkers() {
    data.items.forEach((item) => {
        let lat = item.lat;
        let lng = item.lng;

        if (isNaN(lat)) {
            lat = 0;
            lng = 0;
        }

        item.marker = new google.maps.Marker({
            map: page.map,
            position: { lat, lng },
            title: `${item.name} : ${item.text_rent}, ${item.text_area}ft², ${item.text_impression}*`,
            animation: null,
        });

        item.marker.addListener('click', (event) => {
            toggle('Info', 'Hidden', 'off');

            if (event.tb.shiftKey) {
                previewItem(item);
                focusItem(item);
            }
            else if (event.tb.altKey) {
                deselectItem(item);
            }
            else {
                focusItem(item);
            }
        });

        if (item.selected) {
            showMarker(item);
        }
        else {
            hideMarker(item);
        }
    });
}

function showMarker(item) {
    item.marker.setVisible(true);
    item.marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => { item.marker.setAnimation(null) }, 500)
}
function hideMarker(item) {
    item.marker.setVisible(false);
}

/* -------------------------------------------------------------------------- */
/*                            Web View Shenanigans                            */
/* -------------------------------------------------------------------------- */

const http = new XMLHttpRequest();
function loadWebViewPage(url) {
    http.abort();

    page.details.classList.add("Loading");
    page.webView.src = "about:blank";
    page.webViewExternal.href = url;

    http.open('get', 'https://cors-anywhere.herokuapp.com/' + url)
    http.onreadystatechange = () => {
        if (http.readyState == 4 && http.status == 200) {
            page.details.classList.remove("Loading");

            let doc = page.webView.contentDocument;
            doc.open();
            doc.write(http.responseText);
            doc.close();
        }
    };

    http.send()
}