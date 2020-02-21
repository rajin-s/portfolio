// Handle video hover thumbnails

// let videos = document.getElementsByTagName("video")
// for (var i = 0; i < videos.length; i++) {
//     let index = i;

//     videos[index].parentElement.parentElement.onmouseenter = () => {
//         videos[index].play();
//         // console.log(`start video for ${videos[index].parentElement.parentElement.id}`)
//     }

//     videos[index].parentElement.parentElement.onmouseleave = () => {
//         videos[index].pause();
//         // console.log(`pause video for ${videos[index].parentElement.parentElement.id}`)
//     }
// }

let hoverThumbs = document.querySelectorAll("[tile-hover-thumb]")
for (var i = 0; i < hoverThumbs.length; i++) {
    let thumb = hoverThumbs[i]
    let imageURL = thumb.attributes['tile-hover-thumb'].value

    thumb.parentElement.parentElement.onmouseenter = () => {
        thumb.style = `background-image: url(${imageURL})`
        this.onmouseenter = null
    }
}