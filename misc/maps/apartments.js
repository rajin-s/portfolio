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

var Label

function parseArguments() {
    var url = new URLSearchParams(window.location.search);
    if (url.has('sheet')) { args.sheetURL = url.get('sheet'); }
    if (url.has('lat')) { args.lat = parseFloat(url.get('lat')); }
    if (url.has('lng')) { args.lng = parseFloat(url.get('lng')); }
    if (url.has('key')) { args.apiKey = url.get('key'); }
}

function onFilterChanged() {
    let text = page.filterInput.value;
    filterInfoList(text);

    // if (text === "") {
    //     console.log(`Use filter: true`);
    //     filterInfoList("true");
    // }
    // else {
    //     text = text.replace(/=/, "==");
    //     text = text.replace(/\band\b/, "&&");
    //     text = text.replace(/\bor\b/, "||");
    //     try {
    //         console.log(`Use filter: ${text}`);
    //         filterInfoList(text);
    //     }
    //     catch
    //     {
    //         console.log(`Invalid filter: ${text}`);
    //     }
    // }
}
page.filterInput.addEventListener('input', onFilterChanged);

/* -------------------------------------------------------------------------- */
/*                               Data Management                              */
/* -------------------------------------------------------------------------- */

let data = {
    items: []
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

        entry.index = i + 1;
        entry.filter = true;

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
        makeNumber('score');

        if (entry.name == "") {
            entry.name = `🏦 ${i + 1}`;
        }

        data.items.push(entry)
    }
}

function onDataLoaded() {
    page.info.classList.remove('Loading');
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
            <div class='Name'><span class='Link'>$index. 🔗 $name</span></div>
            <div><span class='Address'>$address</span></div>
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
            <div class="Spacer"></div>
            <div class='Score' title=
                '$text_impressionperrent */$ × $text_area ft²'>
                score: $text_score</div>
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
            result = result.replace(new RegExp(`\\$${k}\\b`, 'g'), v);
        }

        let newElement = document.createElement('div');
        newElement.classList.add('Item');
        newElement.innerHTML = result;

        newElement.tabIndex = i;
        i++;

        let target = item;
        newElement.onclick = (event) => {
            if (item.selected) {
                deselectItem(item);
            }
            else {
                selectItem(item);
            }
        };
        newElement.getElementsByClassName('Link')[0].onclick = (event) => {
            if (item.previewing) {
                unpreviewItem(item)
            }
            else {
                previewItem(item);
                showMarker(item); // only if it's filtered and selected
            }
            event.stopPropagation();
        };
        newElement.getElementsByClassName('Address')[0].onclick = (event) => {
            page.map.panTo({lat: item.lat, lng: item.lng});
            event.stopPropagation();
            focusItem(item, false);
        };

        page.infoList.appendChild(newElement);
        item.element = newElement;
        item.selected = false;
    });

    onFilterChanged();
}

function selectItem(item) {

    if (!item.selected) {
        item.selected = true;
        showMarker(item);
    }

    item.element.classList.add('Selected');
    item.label.container.classList.add('Selected');
}

function deselectItem(item) {
    item.selected = false;
    item.element.classList.remove('Selected');
    item.label.container.classList.remove('Selected');

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

function focusItem(item, scroll=true) {
    data.items.forEach((item) => { item.element.classList.remove('Focus'); });

    item.focused = true;
    item.element.classList.add('Focus');
    focusLabel(item);

    if (scroll)
    {
        let y = item.element.offsetTop - page.infoList.offsetTop;
        page.infoList.scrollTo({ top: y, behavior: 'smooth' });
    }

    setTimeout(() => { item.element.focus({ preventScroll: true }); }, 1);
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

const patterns = {
    group: /\((.+?)\)/g,
    elements: /(\S*) (\S*) (.*)/,
};

function filterInfoList(expression) {

    if (expression == "") {
        return;
    }

    if (data.items.length == 0) {
        return;
    }

    // Reset filter
    data.items.forEach((item) => { item.filter = true });

    // Split into (...) groups
    let groups = expression.matchAll(patterns.group);

    // Process each group
    for (let group of groups) {
        let elements = group[1].match(patterns.elements);

        if (elements == null) {
            console.log(`Invalid filter group: ${group}`)
            return;
        }

        let name = elements[1];
        let op = elements[2];
        let other = elements[3];

        if (data.items[0][name] == undefined) {
            console.log(`Invalid property: ${name}`);
            return;
        }

        let ref_value = data.items[0][name];
        if (Number.isInteger(ref_value)) {
            other = parseInt(other);
            if (isNaN(other)) {
                return;
            }
        }

        if (op == "is" || op == "==") {
            data.items.forEach((item) => { item.filter = item.filter && (item[name] == other); });
        }
        else if (op == "has") {
            data.items.forEach((item) => { item.filter = item.filter && (item[name].search(other) >= 0); });
        }
        else if (op == "<") {
            data.items.forEach((item) => { item.filter = item.filter && (item[name] < other); });
        }
        else if (op == ">") {
            data.items.forEach((item) => { item.filter = item.filter && (item[name] > other); });
        }
        else if (op == "<=") {
            data.items.forEach((item) => { item.filter = item.filter && (item[name] <= other); });
        }
        else if (op == ">=") {
            data.items.forEach((item) => { item.filter = item.filter && (item[name] >= other); });
        }
        else {
            console.log(`Invalid filter operation: ${op}`);
            return;
        }
    }

    data.items.forEach((item) => {
        if (item.filter) {
            item.element.style.display = 'unset';
            item.label.container.classList.remove('FilterOut');
            showMarker(item);
        }
        else {
            item.element.style.display = 'none';
            item.label.container.classList.add('FilterOut');
            hideMarker(item);
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
    createLabelClass();
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

        let labelContent = document.createElement('div', 'foo');
        item.label = new Label(item.marker, labelContent);
        item.label.setMap(page.map);

        item.label.container.onclick = (event) => {
            if (event.altKey)
            {
                deselectItem(item);
            }
            else if (event.shiftKey || item.focused) {
                selectItem(item);
                focusItem(item);
            }
            else {
                focusItem(item);
            }
        };

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
    if (item.filter && item.selected) {
        item.marker.setVisible(true);
        item.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => { item.marker.setAnimation(null) }, 500)
    }
}
function hideMarker(item) {
    item.marker.setVisible(false);
}

let lastFocusedLabel = null;
function focusLabel(item) {
    if (lastFocusedLabel != null)
    {
        lastFocusedLabel.container.classList.remove('Focus');
    }

    item.label.container.classList.add('Focus');
    lastFocusedLabel = item.label;
}
function unfocusLabel(item) {
    item.label.container.classList.remove('Focus');
}

function createLabelClass() {
    function LabelClass(marker, content) {
        this.marker = marker

        this.content = content
        content.classList.add('MapLabel')

        this.container = document.createElement('div')
        this.container.classList.add('MapAnchor')
        this.container.appendChild(content)

        google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.container)
    }

    LabelClass.prototype = Object.create(google.maps.OverlayView.prototype)

    LabelClass.prototype.onAdd = function () {
        this.getPanes().floatPane.appendChild(this.container)
    }
    LabelClass.prototype.onRemove = function () {
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container)
        }
    }
    LabelClass.prototype.draw = function () {
        var position = this.getProjection().fromLatLngToDivPixel(this.marker.position)
        this.container.style.left = position.x + 'px'
        this.container.style.top = position.y + 'px'
    }

    Label = LabelClass
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