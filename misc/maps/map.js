var sheetURL = ""
var centerLocation = { lat: 47.58381, lng: 237.74968 }
var apiKey = ""

var doPaths = false
var transitTarget = "Bellevue Transit Center"

var map = {}
var geo = {}
var directions = {}
var data = []
var metadata = {}

var Label
var allLabelContents = []

function loadMap() {
    console.log("Loading Map")
    parseQueryString()

    if (apiKey != "") {
        let scriptURL = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initializeMap`
        let e = document.createElement('script')
        e.setAttribute('src', scriptURL)
        e.setAttribute('async', "")
        e.setAttribute('defer', "")

        document.getElementById("map").appendChild(e)
    }
}

function parseQueryString() {
    console.log("Parsing Query String")

    var url = new URLSearchParams(window.location.search)
    if (url.has('sheet')) {
        sheetURL = url.get('sheet')
    }
    if (url.has('lat')) {
        centerLocation.lat = parseFloat(url.get('lat'))
    }
    if (url.has('lng')) {
        centerLocation.lng = parseFloat(url.get('lng'))
    }
    if (url.has('key')) {
        apiKey = url.get('key')
    }
    if (url.has('transit')) {
        transitTarget = url.get('transit')
        doPaths = true
    }
}

function initializeMap() {
    console.log("Creating Map")
    map = new google.maps.Map(
        document.getElementById("map"),
        {
            center: centerLocation,
            zoom: 12
        }
    )

    // var bikeLayer = new google.maps.BicyclingLayer()
    // bikeLayer.setMap(map)

    createLabelClass()
    geo = new google.maps.Geocoder()
    if (doPaths) {
        directions = new google.maps.Directions()
    }

    if (sheetURL != "") {
        fetchData()
    }
}

function fetchData() {
    console.log("Fetching Data")
    fetch(sheetURL, { cache: 'no-store' }).then(res => res.blob()).then(blob => {
        blob.text().then(text => {
            readData(text)
        })
    })
}

function readData(text) {
    console.log("Reading Data")

    // Split the text into lines, then split lines into entries
    let lines = text.split('\n')
    for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].split('\t')
    }
    if (lines.length == 0) {
        console.log("No data to parse")
    }

    let headerRow = lines[0]
    for (var i = 0; i < headerRow.length; i++) {
        headerRow[i] = headerRow[i].toLowerCase().trim()
    }

    for (var i = 1; i < lines.length; i++) {
        let line = lines[i]
        var entry = {}

        let count = headerRow.length < line.length ? headerRow.length : line.length
        for (var j = 0; j < count; j++) {
            entry[headerRow[j]] = line[j].trim()
        }

        entry.rent = parseInt(entry.rent.replace(/[\$,]/g, ''))
        entry.bedrooms = parseInt(entry.bedrooms)
        entry.area = parseInt(entry.area)
        entry.rentperarea = parseFloat(entry.rentperarea.replace(/[\$,]/g, ''))

        data.push(entry)
    }

    function getMinMax(name) {
        let minKey = `${name}Min`
        let maxKey = `${name}Max`
        metadata[minKey] = 9999
        metadata[maxKey] = -9999

        for (var i = 0; i < data.length; i++) {
            let entry = data[i]
            if (name in entry && entry[name] > 0) {
                if (entry[name] < metadata[minKey]) {
                    metadata[minKey] = entry[name]
                }
                else if (entry[name] > metadata[maxKey]) {
                    metadata[maxKey] = entry[name]
                }
            }
        }
    }

    getMinMax('rent')
    getMinMax('area')
    getMinMax('rentperarea')

    placeMarkers()
}

function createLabelClass() {
    function LabelClass(marker, content) {
        this.marker = marker

        this.content = content
        content.classList.add('map-marker-label')

        let anchor = document.createElement('div')
        anchor.classList.add('map-marker-label-anchor')
        anchor.appendChild(content)

        this.container = document.createElement('div')
        this.container.classList.add('map-marker-label-container')
        this.container.appendChild(anchor)

        // google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.container)
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

function placeMarkers() {
    const entryDelay = 200
    const limitDelay = 1000

    console.log("Placing Markers")

    function handleEntry(i) {
        if (i >= data.length) {
            console.log("Finished placing markers")
            document.getElementById("loading-status").remove()
            return
        }

        document.getElementById("loading-status").innerText = "Loading..."

        let entry = data[i]
        if ('address' in entry) {
            let index = i
            geo.geocode({ 'address': entry.address }, (results, status) => {
                if (status === 'OK') {
                    entry.location = results[0].geometry.location
                    placeMarker(entry)
                    setTimeout(() => handleEntry(index + 1), entryDelay)
                }
                else if (status === 'OVER_QUERY_LIMIT') {
                    console.log("Waiting for bandwidth...")
                    document.getElementById("loading-status").innerText = "Waiting..."
                    setTimeout(() => handleEntry(index), limitDelay)
                }
                else {
                    console.log(`Failed to lookup address '${entry.address}': ${status}`)
                    setTimeout(() => handleEntry(index + 1), entryDelay)
                }
            })
        }
        else {
            // Skip this entry since it has no address
            console.log(`Entry ${i} has no address`)
            handleEntry(i + 1)
        }
    }

    handleEntry(0)

    // document.getElementById("map").classList.add('select-all-marker-labels')
    document.addEventListener("keydown", (e) => {
        if (e.key == 'a') {
            document.getElementById("map").classList.toggle('select-all-marker-labels')
        }
    })
}

function placeMarker(entry) {
    let marker = new google.maps.Marker({
        map: map,
        position: entry.location,
        title: entry.name,
        animation: google.maps.Animation.BOUNCE,
    })
    setTimeout(() => { marker.setAnimation(null) }, 500)

    let labelContent = createLabelContent(entry)
    let label = new Label(marker, labelContent)
    label.setMap(map)

    let infoContent = createInfoWindowContent(entry)
    let info = new google.maps.InfoWindow({
        content: infoContent
    })

    info.isOpen = false
    marker.addListener('click', () => {
        if (info.isOpen) {
            info.close()
            labelContent.classList.remove('info-selected')
            info.isOpen = false
        }
        else {
            info.open(map, marker)
            labelContent.classList.add('info-selected')
            info.isOpen = true
        }
    })
    info.addListener('closeclick', () => {
        labelContent.classList.remove('info-selected')
    })
    // infoContent.onclick = () => {
    //     info.close()
    //     labelContent.classList.remove('info-selected')
    // }
}

var tagColors = { next: 0 }
function createInfoWindowContent(entry) {
    function getPercent(name) {
        let minKey = `${name}Min`
        let maxKey = `${name}Max`

        if (minKey in metadata) {
            let t = (entry[name] - metadata[minKey]) / (metadata[maxKey] - metadata[minKey])
            return Math.max(1, Math.floor((1 - t) * 100))
        }

        return null
    }

    let rentPercent = getPercent('rent')
    let areaPercent = getPercent('area')
    let rentPerAreaPercent = getPercent('rentperarea')

    function createElement(tag, classes, text) {
        let e = document.createElement(tag)
        e.innerHTML = text
        classes.forEach(x => e.classList.add(x))
        return e
    }

    let content = document.createElement('div')
    content.classList.add("map-info")
    if ('name' in entry && entry.name != "") {
        if ('link' in entry && entry.link != "") {
            content.appendChild(createElement('h2', ["name"], `<a href="${entry.link}" target="_blank">${entry.name}</a>`))
        }
        else {
            content.appendChild(createElement('h2', ["name"], `${entry.name}`))
        }
        content.appendChild(createElement('div', ["address"], entry.address))
    }
    else {
        if ('link' in entry && entry.link != "") {
            content.appendChild(createElement('div', ["address"], `<a href="${entry.link}" target="_blank">${entry.address}</a>`))
        }
        else {
            content.appendChild(createElement('div', ["address"], entry.address))
        }
    }

    content.appendChild(createElement('div', ["rent"], `$${entry.rent}/mo &mdash; <strong>${rentPercent / 10}/10</em></strong>`))
    content.appendChild(createElement('div', ["area"], `${entry.area}ft² &mdash; <strong>${(100 - areaPercent) / 10}/10</strong>`))

    content.appendChild(createElement('div', ["spacer"], ""))
    content.appendChild(createElement('div', ["calculated"], `$${Math.floor(entry.rentperarea * 100) / 100}/ft² &mdash; <strong>${rentPerAreaPercent / 10}/10</strong>`))
    
    content.appendChild(createElement('div', ["spacer"], ""))
    content.appendChild(createElement('h3', ["calculated"], `${Math.floor((rentPercent + rentPerAreaPercent + 100 - areaPercent) / 3) / 10}/10`))

    if ('tags' in entry) {
        content.appendChild(createElement('div', ["spacer"], ""))
        let tags = entry.tags.split(',')

        let tagParent = createElement('div', ["tags"], "")
        tags.forEach(x => {
            let tag = x.trim()
            if (tag != "") {
                let tagElement = createElement('div', ["tag"], tag)

                if (!(tag in tagColors)) {
                    tagColors[tag] = `hsl(${tagColors.next}deg, 80%, 90%)`
                    tagColors.next += 77
                }
                tagElement.style.backgroundColor = tagColors[tag]
                tagParent.appendChild(tagElement)
            }
        })
        content.appendChild(tagParent)
    }

    return content
}

function createLabelContent(entry) {
    const hueMin = 0
    const hueMax = 190
    function createElement(name, colorSource, format, swapHues) {
        let e = document.createElement('span')
        e.classList.add("map-marker-label-element")

        let text = format.replace(/\*/g, entry[name])
        e.innerHTML = text

        let minKey = `${colorSource}Min`
        let maxKey = `${colorSource}Max`

        if (minKey in metadata) {
            let min = swapHues ? metadata[maxKey] : metadata[minKey]
            let max = swapHues ? metadata[minKey] : metadata[maxKey]

            let t = (entry[colorSource] - min) / (max - min)
            let hue = hueMin + (hueMax - hueMin) * t
            e.style.backgroundColor = `hsl(${hue}deg, 85%, 80%)`
            e.style.color = `hsl(${hue + 15}deg, 90%, 25%)`
            e.style.borderColor = `hsl(${hue + 5}deg, 80%, 45%)`
        }

        return e
    }

    let labelElements = []
    labelElements.push(createElement('bedrooms', 'rentperarea', "*b", true))
    labelElements.push(createElement('area', 'area', "*ft²", false))
    labelElements.push(createElement('rent', 'rent', "$*/mo", true))

    let labelContent = document.createElement('div')
    labelElements.forEach(x => labelContent.appendChild(x))

    labelContent.onclick = () => { labelContent.classList.toggle('selected') }

    allLabelContents.push(labelContent)

    return labelContent
}

loadMap()