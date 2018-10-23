/************************
 REMOTE CONTENT HANDLING
 ************************/


const contentDirectory = "content/";
const fileExtension = ".xml"
const listingFileName = "listing" + fileExtension;

const variablePrefix = "$";
function varPattern(varName) {
    return new RegExp("\\" + variablePrefix + varName, 'g');
}
// This prefix prevents the page from trying to HTTP GET images, etc. where the src is a placeholder
// It is simply removed at the end of the injection process
const placeholderPrefix = "%%";

const remoteContentAttr = "get";
const getQueryAttr = "get-query";
const listAttr = "list";
const valueAttr = "value";
const indexAttr = "index"
const storeListAsSingle = false;

const multiContentAttr = "get-multi";
const multiMaxDisplayAttr = "max-items";
const multiMaxRowAttr = "row-max";
const excludeByDateAttr = "exclude-by-date";

const injLinkAttr = "inj-link";
const injSrcAttr = "inj-src";

const preprocessTag = "!format";

const disableCache = false;
var getCache = {};
var parseCache = {};
var baseHTML = {};

var injectsInProgress = 0;
var injectsInReleaseQueue = 0;
var injectQueueLocked = false;
var onCompleteAllInjects = function () { };

function dateCheck(inputDate) {
    let tokens = inputDate.split('/');

    let month = parseInt(tokens[0]) - 1;
    let day = parseInt(tokens[1]);

    let currentDate = new Date(Date.now());
    let currentMonth = currentDate.getMonth();
    let currentDay = currentDate.getDate();

    return (currentMonth < month || (currentMonth == month && currentDay <= day));
}

function startInjectProcess() {
    injectsInProgress += 1;
    // console.log(injectsInProgress + "+");
}
function completeInject() {
    if (injectQueueLocked) {
        injectsInReleaseQueue += 1;
    }
    else {
        injectsInProgress -= 1;
        // console.log(injectsInProgress + "-");

        if (injectsInProgress == 0) {
            console.log("Call onCompleteAllInjects (Complete)");
            onCompleteAllInjects();
        }
    }
}
function lockInjectQueue() {
    injectQueueLocked = true;
}
function unlockInjectQueue() {
    injectQueueLocked = false;
    if (injectsInReleaseQueue > 0) {
        injectsInProgress -= injectsInReleaseQueue;
        if (injectsInProgress == 0) {
            console.log("Call onCompleteAllInjects (Queue)");
            onCompleteAllInjects();
        }
    }
}

// Apply callback K(string) onto contents of specified file
//  if file can't be found, call failK()
function getFileContents(filePath, K, failK) {
    if (getCache[filePath] != null && !disableCache) {
        console.log("[Get File Contents] returned cached value for " + filePath);
        K(getCache[filePath]);
    }
    else {
        var http = new XMLHttpRequest();
        http.onreadystatechange = function () {
            if (http.readyState == 4) {
                if (http.status == 200) {
                    if (getCache[filePath] != null && !disableCache) {
                        console.log("[Get File Contents] returned cached value for " + filePath);
                        K(getCache[filePath]);
                    }
                    else {
                        console.log("[Get File Contents] No cached value for " + filePath);
                        getCache[filePath] = http.responseText;
                        K(http.responseText);
                    }
                }
                else {
                    failK();
                }
            }
        }
        http.open("GET", filePath, true);
        http.send(null);
    }
}

// Parse XML into JS Object
//  - Only supports top level items within root tag
//  - Root tag is currently ignored
function parse(content, getLink, filePath) {
    if (parseCache[content] != null && !disableCache) {
        // console.log("[Parse] returned cached value for " + content.substring(0, 12) + "...");
        return parseCache[content];
    }

    result = {};
    result["getLink"] = getLink;
    result["filePath"] = filePath;

    var inline = (/<.+?>([\s\S]*)<\/.+?>/g).exec(content)[1];
    // console.log(inline);
    inline = inline.replace(/>(?:\r\n|\r|\n)/g, '>').replace(/(?:\r\n|\r|\n)</g, '<').replace(/,(?:\r\n|\r|\n)/g, ', ').replace(/\t/g, '').replace(/    /g, "");
    let re = /<(.+?)>\s*([\s\S]+?)\s*<\/.+?>/g;

    var m = re.exec(inline);
    while (m != null) {
        let k = m[1];
        var v = m[2];

        if (v.search(preprocessTag) >= 0) {
            // console.log(v);
            v = v.replace(new RegExp(preprocessTag.concat("\\s*"), 'g'), "");
            v = muProcess(v);
            // console.log(v);
        }

        if (result[k] == null) {
            result[k] = v;
        }
        else {
            if (Array.isArray(result[k])) {
                result[k].push(v);
            }
            else {
                result[k] = [result[k], v];
            }
        }

        m = re.exec(inline);
    }

    parseCache[content] = result;
    return result;
}

// Inject JS Object into HTML
function inject(o, target) {
    var html = target.outerHTML;
    for (var k in o) {
        var v = o[k];
        // console.log(k + ": " + v);

        if (Array.isArray(v)) {
            let protos = target.querySelectorAll("[" + listAttr + "=" + k + "]");
            protos.forEach(function (proto) {
                let varName = proto.getAttribute(valueAttr);
                let indexName = proto.getAttribute(indexAttr);

                if (varName == null) {
                    console.log("[Inject] List target with no " + valueAttr + " attribute!")
                    console.log(proto);
                }
                else {
                    let protoStartHTML = proto.outerHTML;

                    proto.removeAttribute(listAttr);
                    proto.removeAttribute(valueAttr);
                    proto.removeAttribute(indexAttr);

                    let protoHTML = proto.outerHTML;
                    var listHTML = "";

                    o[k].forEach(function (item, i) {
                        // Transform relative paths
                        item = item.replace(/\.\//g, contentDirectory);
                        let varExp = varPattern(varName);
                        var itemHTML = protoHTML.replace(varExp, item);
                        if (indexName != null) {
                            let idxExp = varPattern(indexName);
                            itemHTML = itemHTML.replace(idxExp, i);
                        }
                        listHTML += itemHTML;
                    });

                    html = html.replace(protoStartHTML, listHTML);
                }
            });
            html = html.replace(varPattern(k), storeListAsSingle ? o[k] : "list"); // Replace list single variables as comma separated value if storeAsSignle, else just "list"
        }
        else {
            // Transform relative paths
            v = v.replace(/\.\//g, contentDirectory);
            html = html.replace(varPattern(k), v);
        }
    }
    target.outerHTML = html.replace(new RegExp(placeholderPrefix, 'g'), "");
}

function getAndInject(getLink, target, addInProgress = true, callback = function () { }) {
    if (addInProgress) startInjectProcess();
    let filePath = contentDirectory + getLink + fileExtension;
    let itemTarget = target;
    getFileContents(filePath,
        function (content) {
            // console.log("Starting inject for " + filePath);
            inject(parse(content, getLink, filePath), itemTarget);
            callback();
            if (addInProgress) completeInject();
        },
        function () {
            console.log("[Get & Inject] File not found! " + filePath);
            callback();
            if (addInProgress) completeInject();
        }
    );
}

function injectAll() {
    let targets = document.querySelectorAll("[" + remoteContentAttr + "]");
    targets.forEach(function (target) {
        let getLink = target.getAttribute(remoteContentAttr);
        getAndInject(getLink, target);
    });
}

// Recursive-ish single step of injectMultiple
//   note: recursive call happens after each item is loaded
function injectMultipleStep(paths, links, index, target, excludeByDate, numLeft = -1) {
    // End condition
    if (index >= paths.length || numLeft == 0) {
        target.parentNode.removeChild(target);
        return;
    }

    startInjectProcess();
    getFileContents(
        paths[index],
        function (content) {
            // Parse content
            var o = parse(content, links[index], paths[index]);
            o["index"] = "" + index;

            // Create target and inject if date check passes 
            //   note: will pass by default if not set to exclude by date
            let hasDate = "date" in o;
            if (!excludeByDate || !hasDate || (hasDate && dateCheck(o["date"]))) {
                let newTarget = target.cloneNode(true);
                target.parentNode.appendChild(newTarget);
                inject(o, newTarget);
                injectMultipleStep(paths, links, index + 1, target, excludeByDate, numLeft - 1);
            }
            else {
                injectMultipleStep(paths, links, index + 1, target, excludeByDate, numLeft);
            }

            completeInject();
        },
        function () {
            console.log("[Inject Multiple] Couldn't get content at path " + paths[index] + "!");
            injectMultipleStep(paths, links, index + 1, target, excludeByDate, numLeft);
            completeInject();
        }
    );
}

function injectMultiple() {
    let targets = document.querySelectorAll("[" + multiContentAttr + "]");
    targets.forEach(function (target) {
        //let tokens = target.getAttribute(multiContentAttr).split('/');
        //let folder = tokens[0];
        //let listingPath = contentDirectory + folder + "/" + (tokens.length > 1 ? tokens[1] + ".xml" : listingFileName);
        let folder = target.getAttribute(multiContentAttr);
        let listingPath = contentDirectory + folder + "/" + listingFileName;
        let excludeByDate = target.getAttribute(excludeByDateAttr) == "true";

        getFileContents(listingPath,
            function (listing) {
                let parent = target.parentNode;
                let totalItems = target.getAttribute(multiMaxDisplayAttr);
                var rowTotal = target.getAttribute(multiMaxRowAttr);

                target.removeAttribute(multiContentAttr);
                target.removeAttribute(multiMaxDisplayAttr);
                target.removeAttribute(multiMaxRowAttr);
                target.removeAttribute(excludeByDateAttr);

                // Split lines into file paths array
                var paths = listing.split(/[\r\n]+/g);
                // Convert to get links
                for (var i = 0; i < paths.length; i++) {
                    paths[i] = folder + "/" + paths[i];
                }
                var links = paths.slice();
                // Convert to absolute paths
                for (var i = 0; i < paths.length; i++) {
                    paths[i] = contentDirectory + paths[i] + fileExtension;
                }

                // console.log(paths);
                if (rowTotal == null) { // Inject multiple without row specification
                    injectMultipleStep(paths, links, 0, target, excludeByDate, totalItems);
                }
                else { // Inject multiple with row specification
                    var itemsLeft = paths.length;
                    var currentParent = parent;
                    var currentTarget = target;
                    var rowCount = (itemsLeft % rowTotal == 0) ? rowTotal : rowTotal - 1;

                    // console.log(rowCount);
                    // console.log(itemsLeft);

                    for (var i in paths) {
                        let itemTarget = currentTarget;
                        let index = i;

                        startInjectProcess();
                        getFileContents(paths[i],
                            function (content) {
                                let o = parse(content, links[index], paths[index]);

                                // Inject if date check passes
                                //   note: will pass by default if not set to exclude by date
                                let hasDate = "date" in o;
                                if (!excludeByDate || !hasDate || (hasDate && dateCheck(o["date"]))) {
                                    inject(o, itemTarget);
                                }
                                else {
                                    // Remove target node if date check fails
                                    itemTarget.parentNode.removeChild(itemTarget);
                                }

                                completeInject();
                            },
                            function () {
                                console.log("[Inject Multiple] Couldn't get content at path " + paths[i] + "!");
                                completeInject();
                            }
                        );

                        rowCount -= 1;
                        itemsLeft -= 1;

                        // Clone target and/or parent
                        if (i != paths.length - 1) {
                            if (rowCount == 0) {
                                rowCount = (itemsLeft % rowTotal == 0) ? rowTotal : rowTotal - 1;
                                var newParent = currentParent.cloneNode(false);
                                currentParent.parentNode.appendChild(newParent);
                                currentParent = newParent;
                            }
                            let newTarget = target.cloneNode(true);
                            currentParent.appendChild(newTarget);
                            currentTarget = newTarget;
                        }
                    }
                }
            },
            function () {
                console.log("[Inject Multiple] Couldn't get listing at path " + listingPath + "!");
            }
        );
    });
}

function injectQuery() {
    let urlParts = window.location.href.split('?');
    if (urlParts.length > 1) {
        let q = urlParts[1];
        let targets = document.querySelectorAll("[" + getQueryAttr + "]");
        targets.forEach(function (target) {
            getAndInject(q, target, true, doAutoExpand);
        });
    }
}

function doAutoExpand() {
    document.querySelectorAll(".auto-expand").forEach(
        function (e, i) {
            // console.log(i);
            e.outerHTML = e.innerHTML;
        }
    );
}

function makeInjectLinks() {
    let links = document.querySelectorAll("[" + injLinkAttr + "]");
    links.forEach(function (link, i, arr) {
        // console.log("link :" + link);

        let get = link.getAttribute(injSrcAttr);
        let targetID = link.getAttribute(injLinkAttr);

        if (targetID == null) {
            console.log("[Make Inject Links] Inject link has no target!");
        }
        else if (get == null) {
            console.log("[Make Inject Links] Inject link has target but no " + injSrcAttr + " attribute!");
        }
        else {
            let target = document.getElementById(targetID);
            if (target == null) {
                console.log("[Make Inject Links] Couldn't get inject target with ID " + targetID + "!");
            }
            else {
                if (baseHTML[targetID] == null) {
                    baseHTML[targetID] = target.outerHTML;
                }
                link.onclick = function () {
                    let itemTarget = document.getElementById(targetID);
                    itemTarget.outerHTML = baseHTML[targetID];
                    console.log("[Inject Link] Open " + get + " in " + targetID);
                    getAndInject(get, document.getElementById(targetID), false, doAutoExpand);
                };
                console.log(targetID + " <-> " + get);
            }
        }
    });
}

lockInjectQueue();
injectMultiple();
injectAll();
injectQuery();
unlockInjectQueue();

onCompleteAllInjects = function () {
    doAutoExpand();
    makeInjectLinks();
};