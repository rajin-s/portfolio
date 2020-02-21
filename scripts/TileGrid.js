let hoverThumbs = document.querySelectorAll("[tile-hover-thumb]")
for (var i = 0; i < hoverThumbs.length; i++) {
    let thumb = hoverThumbs[i]
    let imageURL = thumb.attributes['tile-hover-thumb'].value

    thumb.parentElement.parentElement.onmouseenter = () => {
        thumb.style = `background-image: url(${imageURL})`
        this.onmouseenter = null
    }
}