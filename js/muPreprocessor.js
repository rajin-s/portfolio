/* Micro Preprocessor for 
 * [M]ark [U]p
 * mu preprocessor */

const defaultFormat = {
    "image": {
        pattern: /#\(([\s\S]+?)\)\[(.*?)\]/g,
        format: "<div class='img $2' style=\"background-image:url('$1');\"></div>"
    },
    "link-same-tab": {
        pattern: /\[=(.+?)\]\[([\s\S]+?)\]/g,
        format: "<a href='$1'>$2</a>"
    },
    "link": {
        pattern: /\[(.+?)\]\[([\s\S]+?)\]/g,
        format: "<a href='$1' target='_blank'>$2</a>"
    },
    "heading": {
        pattern: /===(.+?)===/g,
        format: "<h><strong>$1</strong></h>"
    },
    "subheading": {
        pattern: /==(.+?)==/g,
        format: "<subh><strong>$1</strong></subh>"
    },
    "bold": {
        pattern: /\*\*(.+?)\*\*/g,
        format: "<strong>$1</strong>"
    },
    "italic": {
        pattern: /__(.+?)__/g,
        format: "<em>$1</em>"
    },
    "paragraph-spacer": {
        pattern: /\s*\(\(\)\)\s*/g,
        format: "<p>&nbsp;</p>"
    },
    "paragraph": {
        pattern: /\s*\(\(([\s\S]+?)\)\)\s*/g,
        format: "<p>$1</p>"
    },
    "list": {
        pattern: /\s*'''([\s\S]+?)'''\s*/g,
        format: "<ul>$1</ul>"
    },
    "list-item": {
        pattern: /\s*--\s*(.*)\s*/g,
        format: "<li>$1</li>"
    },
    "code-inline": {
        pattern: /`(.+?)`/g,
        format: "<code>$1</code>"
    },
    "break": {
        pattern: /(\r\n|\n)(\r\n|\n)/g,
        format: "<br/><br/>"
    },
};

function muProcess(input, format = defaultFormat) {
    var output = input;
    for (k in format) {
        let pattern = format[k].pattern;
        let replace = format[k].format;
        if (output.match(pattern) != null) {
            console.log("match " + k);
        }
        output = output.replace(pattern, replace);
    }
    return output;
}