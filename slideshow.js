var slideLength = 5000;
var slideVariation = 1000;

class SlideShow {
    constructor(slides, slideanchors, slidecontainer, timeout) {
        this.slide = 0;
        this.repeat = -1;
        this.numslides = slides.length;
        this.slides = slides;
        this.slideanchors = slideanchors;
        this.slidecontainer = slidecontainer;
        this.timeout = timeout;

        this.slidecontainer.style += ";width:" + (this.numslides * 100) + "%";
    }

    setSlide(n) {
        this.slide = n;
        for (i = 0; i < this.numslides; i++) {
            if (i == n) {
                this.slideanchors[i].classList.add('active');
                this.slides[i].classList.add('active');
            }
            else {
                this.slideanchors[i].classList.remove('active');
                this.slides[i].classList.remove('active');
            }
        }
        this.slidecontainer.style.left = n * -100 + "%";
        this.restartTimer();
    }
    advanceSlide() {
        this.slide = (this.slide + 1) % this.numslides;
        this.setSlide(this.slide);
    }
    restartTimer() {
        clearTimeout(this.repeat);
        var instance = this;
        this.repeat = setTimeout(function () { instance.advanceSlide(); }, this.timeout);
    }
    stopTimer() {
        clearTimeout(this.repeat);
    }
};

var shows = [];

window.onload = function () {
    var showElements = document.getElementsByClassName("slide-show-container");

    for (i = 0; i < showElements.length; i++) {
        var slides = showElements[i].getElementsByClassName("slide");
        var slideanchors = showElements[i].getElementsByClassName("slide-a");
        var slidecontainer = showElements[i].getElementsByClassName("slide-container")[0];
        var newshow = new SlideShow(slides, slideanchors, slidecontainer, slideLength + Math.round(Math.random() * slideVariation));
        shows[i] = newshow;
    }

    for (j = 0; j < shows.length; j++)
    {
        shows[j].setSlide(j % shows[j].numslides);
    }
};

function pauseShow(n) {
	shows[n].stopTimer();
}
function unpauseShow(n) {
	shows[n].restartTimer();
}
function goToSlide(n, s) {
    shows[n].setSlide(s);
}
function advance(n) {
    shows[n].advanceSlide();
}