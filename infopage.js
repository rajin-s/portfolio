class InfoPage {
    constructor(first, second) {
        this.first = first;
        this.second = second;
    }

    swap() {
        this.first.classList.toggle('active');
        this.second.classList.toggle('active');
    }
}

var pages = [];

var prev = window.onload;
window.onload = function () {
    var firstPages = document.getElementsByClassName('page first');
    var secondPages = document.getElementsByClassName('page second');

    for (i = 0; i < firstPages.length; i++) {
        pages[i] = new InfoPage(firstPages[i], secondPages[i]);
    }

    //console.log(prev);
    if (prev != null) prev();
};

function swapPage(n) {
    pages[n].swap();
}