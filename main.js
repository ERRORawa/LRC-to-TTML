function adjustLrcTime(lrcText) {
    const delayMs = parseFloat(document.querySelector(".delay").value) * 1000;
    const timeTagRegex = /\[(\d{2}):(\d{2})\.(\d{3})\]/g;
    const adjustedLrc = lrcText.replace(timeTagRegex, (match, minutes, seconds, ms) => {
        const totalMs = 
            parseInt(minutes, 10) * 60 * 1000 +
            parseInt(seconds, 10) * 1000 +
            parseInt(ms, 10);
        const newTotalMs = totalMs + delayMs;
        if (newTotalMs < 0) {
            return '[00:00.000]';
        }
        const newMinutes = Math.floor(newTotalMs / 60000).toString().padStart(2, '0');
        const remainingMs = newTotalMs % 60000;
        const newSeconds = Math.floor(remainingMs / 1000).toString().padStart(2, '0');
        const newMs = (remainingMs % 1000).toString().padStart(3, '0');
        return `[${newMinutes}:${newSeconds}.${newMs}]`;
    });
    
    return adjustedLrc;
}

function cover(lyrics) {
    fileName = "untitled.lrml";
    ttml = [`<tt>`, `<head>`, `<metadata>`];
    meta = [];
    body = [];
    var artists = "";
    var musicName = "";
    var mi = 0;
    var bi = 0;
    var bEnd = [];
    var lastTime = "";
    for (var i = 0; i < lyrics.length; i++) {
        nowRow = lyrics[i];
        var isMeta = false;
        var metaSplit = "";
        meta[mi] = { key: "", value: "" };
        body[bi] = { begin: "", end: "", texts: [] };
        if (nowRow.startsWith("[ar:")) {
            isMeta = true;
            metaSplit = "[ar:";
            meta[mi].key = "artists";
        } else if (nowRow.startsWith("[al:")) {
            isMeta = true;
            metaSplit = "[al:";
            meta[mi].key = "album";
        } else if (nowRow.startsWith("[ti:")) {
            isMeta = true;
            metaSplit = "[ti:";
            meta[mi].key = "musicName";
        }
        if (isMeta) {
            const text = nowRow.split(metaSplit)[1];
            meta[mi].value = text.substring(0,text.length - 1);
            if (metaSplit == "[ar:") {
                artists = meta[mi].value;
            } else if (metaSplit == "[ti:") {
                musicName = meta[mi].value;
            }
            mi++;
        } else if (nowRow.charCodeAt(1) >= 48 && nowRow.charCodeAt(1) <= 57) {
            const sp = nowRow.split("[");
            body[bi].begin = sp[1].split("]")[0];
            if (sp.length != 2) {
                body[bi].end = sp[sp.length - 1].split("]")[0];
                bEnd[bi] = true;
            }
            if (body[bi].begin == lastTime) {
                const spl = sp[1].split("]");
                body[bi - 1].texts[body[bi - 1].texts.length - 1] = { text: spl[1], translate: true, lang: "zh-CN" };
                body[bi - 1].texts.push({});
            } else {
                if (bEnd[bi]) {
                    for (var j = 1; j < sp.length; j++) {
                        const spl = sp[j].split("]");
                        if (j != 1) {
                            body[bi].texts[j - 2].end = spl[0];
                        }
                        body[bi].texts[j - 1] = { begin: spl[0], end: "", text: spl[1] };
                    }
                } else {
                    const spl = sp[1].split("]");
                    body[bi].texts[0] = { begin: spl[0], end: "", text: spl[1], oneRow: true };
                    body[bi].texts.push({});
                }
                if (bi != 0 && !bEnd[bi - 1]) {
                    body[bi - 1].end = body[bi].begin;
                    body[bi - 1].texts[0].end = body[bi].begin;
                }
                lastTime = body[bi].begin;
                bi++;
            }
        }
    }
    for (var i = 0; i < meta.length - 1; i++) {
        ttml.push(`<amll:meta key="${meta[i].key}" value="${meta[i].value}" />`);
    }
    ttml.push("</metadata>");
    ttml.push("</head>");
    ttml.push(`<body dur="${body[body.length - 2].end}">`);
    ttml.push(`<div begin="00:00.000" end="${body[body.length - 2].end}">`);
    for (var i = 0; i < body.length - 1; i++) {
        ttml.push(`<p begin="${body[i].begin}" end="${body[i].end}">`);
        for (var j = 0; j < body[i].texts.length - 1; j++) {
            if (body[i].texts[j].translate) {
                ttml[ttml.length - 1] = ttml[ttml.length - 1] + `<span ttm:role="x-translation" xml:lang="${body[i].texts[j].lang}">${body[i].texts[j].text}</span>`;
            } else if (body[i].texts[j].oneRow) {
                ttml[ttml.length - 1] = ttml[ttml.length - 1] + `${body[i].texts[j].text}`;
            } else {
                ttml[ttml.length - 1] = ttml[ttml.length - 1] + `<span begin="${body[i].texts[j].begin}" end="${body[i].texts[j].end}">${body[i].texts[j].text}</span>`;
            }
        }
        ttml[ttml.length - 1] = ttml[ttml.length - 1] + "</p>";
    }
    ttml.push(`</div>`);
    ttml.push(`</body>`);
    ttml.push(`</tt>`);
    if (musicName != "") {
        fileName = musicName;
        if (artists != "") {
            fileName +=  `- ${artists}.lrml`;
        } else {
            fileName += ".ttml";
        }
    }
    if (document.querySelector(".download").checked) {
        const blob = new Blob([`${ttml.join("\n")}`], { type: "text/plain;charset=utf-8" });
        const dLink = document.createElement("a");
        dLink.href = URL.createObjectURL(blob);
        dLink.download = fileName;
        dLink.click();
        URL.revokeObjectURL(dLink.href);
    }
    document.querySelector(".musicName").innerText = fileName;
    document.body.querySelector(".preview").value = `${ttml.join("\n")}\n\n${lyrics.join("\n")}`;
}

var input = document.querySelector(".upload");
var texts = [];
var ttml = [];
var meta = [];
var fileName = "";

input.addEventListener("change", function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function() {
        var textDelay = adjustLrcTime(this.result);
        var textArr = textDelay.split("\n");
        texts = textArr.filter(item => item !== '');
        cover(texts);
    }
    reader.readAsText(file);
});

document.body.querySelector(".cover").addEventListener("click", function() {
    var textDelay = adjustLrcTime(document.body.querySelector(".waitCover").value);
    cover(textDelay.split("\n"));
});