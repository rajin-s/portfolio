let slideDelay = 3
let manualOverrideDelay = 5

var currentIndex
var advanceIntervalHandle = 0
var resetIntervalHandle = 0

function getSlideToggleCallback(index) {
    return () => {
        if (advanceIntervalHandle != null) {
            clearInterval(advanceIntervalHandle)
            advanceIntervalHandle = null
        }

        if (resetIntervalHandle != null) {
            clearTimeout(resetIntervalHandle)
        }

        currentIndex = index

        resetIntervalHandle = setTimeout(resetAdvanceInterval, manualOverrideDelay * 1000)

        // console.log("toggle callback")
    }
}

let slideToggles = document.getElementsByClassName("slide-toggle")
for (var i = 0; i < slideToggles.length; i++) {
    let toggle = slideToggles[i]
    toggle.addEventListener("change", getSlideToggleCallback(i))
}

function advanceSlide() {
    if (slideToggles.length > 1) {
        currentIndex = (currentIndex + 1) % slideToggles.length
        document.getElementById(`slide${currentIndex}`).checked = true
    
        // console.log(`advance slide to ${currentIndex}`)
    }
}
function resetAdvanceInterval() {
    advanceIntervalHandle = setInterval(advanceSlide, slideDelay * 1000)

    // console.log("reset advance interval")
}

currentIndex = slideToggles.length - 1
resetAdvanceInterval()