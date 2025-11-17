function md5cycle(x, k) {
    var a = x[0],
    b = x[1],
    c = x[2],
    d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);

}

function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
}

function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function md51(s) {
    txt = '';
    var n = s.length,
    state = [1732584193, -271733879, -1732584194, 271733878],
    i;
    for (i = 64; i <= s.length; i += 64) {
        md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++)
    tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
}

/* there needs to be support for Unicode here,
* unless we pretend that we can redefine the MD-5
* algorithm for multi-byte characters (perhaps
* by adding every four 16-bit characters and
* shortening the sum to 32 bits). Otherwise
* I suggest performing MD-5 as if every character
* was two bytes--e.g., 0040 0025 = @%--but then
* how will an ordinary MD-5 sum be matched?
* There is no way to standardize text to something
* like UTF-8 before transformation; speed cost is
* utterly prohibitive. The JavaScript standard
* itself needs to look at this: it should start
* providing access to strings as preformed UTF-8
* 8-bit unsigned value arrays.
*/
function md5blk(s) { /* I figured global was faster.   */
    var md5blks = [],
    i; /* Andy King said do it this way. */
    for (i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
}

var hex_chr = '0123456789abcdef'.split('');

function rhex(n) {
    var s = '',
    j = 0;
    for (; j < 4; j++)
    s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] +
    hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
}

function hex(x) {
    for (var i = 0; i < x.length; i++)
    x[i] = rhex(x[i]);
    return x.join('');
}

function md5(s) {
    return hex(md51(s));
}

/* this function is much faster,
so if possible we use it. Some IEs
are the only ones I know of that
need the idiotic second function,
generated by an if clause.  */

function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
}

if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
    function add32(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
        msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
}

var imageURLToSend = '';

function updateImageButton () {
    if(localStorage.getItem("dataURL") == null) {
        document.getElementById("uploadbutton").disabled = true;
    } else {
        document.getElementById("uploadbutton").disabled = false;
    }
}
setInterval(updateImageButton, 500);

function getUrlParam() {
    //clearDrawing();
    var img = document.getElementById("photoToDraw");
    var params = new URLSearchParams(window.location.search);
console.log(params.get("image_RecordID_Repeated"))
    if(params.get("image_RecordID_Repeated"))
    {Console.log("NOT EMPTY")
  image_RecordID_Repeated = params.get("image_RecordID_Repeated")}
  else{image_RecordID_Repeated = image_RecordID}

    if (params.has("PhotoURL")) {
        photoURL = params.get("PhotoURL");
        artist = params.get("recordId");
        // console.log(img)

        if (photoURL) {
            document.getElementById('imageURL').value = photoURL;
            img.src = photoURL;
            imageURLToSend.src = photoURL;
            // console.log(imageURLToSend);

            //start send image
            if(image_RecordID_Repeated =="" || image_RecordID_Repeated == null){
                base('Images').create([{
                    "fields": {
                        "Image_File": [{
                            "url": photoURL
                        }]
                    }
                }

            ], function(err, records) {
                if (err) {
                    console.log("new error");
                    console.error(err);
                    return;
                }
                records.forEach(function(record) {
                    // console.log("new image");
                    image_RecordID = record.getId()
                    // console.log(image_RecordID);
                });
            });
        }
        else
        {
            //console.log("REPEAT!")
            image_RecordID=image_RecordID_Repeated;
            //console.log(image_RecordID)

        }

    }
} else {
    img.src = "https://bilalghalib.com/does/wp-content/uploads/2020/08/B_headshot-1.jpg";
    imageURLToSend.src = "https://bilalghalib.com/does/wp-content/uploads/2020/08/B_headshot-1.jpg";
    //console.log(imageURLToSend);
}
var newImageWidth = "642";
var img2 = document.getElementById("photoToDraw");
//console.log(newImageWidth)
img2.width = newImageWidth;
}

function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }


    return new File([u8arr], filename, {
        type: mime
    });
}

const getBase64Image = (url) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        //console.log(dataURL)
    }
    img.src = url
}

function saveDynamicDataToFile() {
    drawImage = localStorage.getItem("dataURL");
    var uniqifier = Math.floor(Math.random() * 900000) + 100000;

    // get the time as a string

    var userInput = JSON.stringify(allPoints);
    var blob = new Blob([userInput], {
        type: "text/plain;charset=utf-8"
    });

    var NameVariable = encodeURI(uniqifier);


    if (artist =="{LOGGED_IN_USER:USERNAME}") {
        if(document.getElementById("uploaderEmail").value != ""){artist = document.getElementById("uploaderEmail").value;}
        else{artist="unknown"}
    }
    if (artist == "" ) {
        if(document.getElementById("uploaderEmail").value != ""){artist = document.getElementById("uploaderEmail").value;}
        else{artist="unknown"}
    }

    var imageFileToUpload = document.getElementById("photoToDraw");
    var blobDrawData = new Blob([drawImage], {
        type: "text/plain;charset=utf-8"
    });

    //Usage example:
    if(!drawImage) {
        $("#upload-status-text").html("Please draw something before you upload");
    }
    var file = dataURLtoFile(drawImage, 'hello.png');
    var linesName = image_RecordID + NameVariable;
    var linesURLImage = "https://draw.wayway.ai/uploads/" + linesName + "lin.png"
    var linesURLText = "https://draw.wayway.ai/uploads/" + linesName + "lin.txt"

    newImageURL = document.getElementById("photoToDraw").src;

    $.ajax({
        type: "POST",
        crossDomain: true,
        url: "./upload2.php",
        //url: "http://localhost/drawing/upload2.php",
        cache: false,
        data: {
            imageName: image_RecordID,
            drawingName: linesName,
            imgOrgURL: newImageURL,
            drawingText: userInput,
            imgBase64: drawImage
        },
        xhr: function() {
            var myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) {
                myXhr.upload.addEventListener('progress', function(e) {
                    var percent_loaded = Math.ceil((e.loaded / e.total)*50);
                    $('#progress-text1').text(percent_loaded+'%');
                    $('#progress').css('width', percent_loaded + '%');
                    if (e.lengthComputable) {
                        $('progress').attr({
                            value: e.loaded / 2,
                            max: e.total,
                        });
                    }
                } , false);
            }
            return myXhr;
        },
        success: function(response) {
            $("#upload-status-text").html("Saved on wayway.io! now Airtable..");
            base('Drawings').create([{
                "fields": {
                    "Artist": artist,
                    "Name": image_RecordID,
                    "Drawing_URL": linesURLImage,
                    "Drawing_Text": [{
                        "url": linesURLText
                    }],
                    "Image_Link": [image_RecordID],
                }
            }
        ], {
            typecast: true
        }, function(err, records) {
            if (err) {
                $("#upload-status-text").html("Saved in wayway.io, but not airtable!");
                return;
            }
            records.forEach(function(record) {
                base('Drawings').update([{
                    "id": record.getId(),

                    "fields": {
                        "Drawing_Image": [{
                            "url": linesURLImage
                        }]
                    }
                }], function(err, records) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    records.forEach(function(record) {
                        console.log(record.get('Drawing_Text'));
                    });
                });



            });
        }); //endairtable
        Board.clearMemory()
    },
    error: function(req, err) {
        $("#upload-status-text").html("Cannot upload to wayway.io, check the connection!");
    }

});
}

function clearDrawing() {
    Board.clearMemory()
}

let runFlag = 0, interval = false;
let drawings = {}, drawing_index = 0;

function runDrawing() {

    let txtUrl = document.getElementById("drawingURL").value;
    if(txtUrl == "") {
        alert("Please enter the url you are gonna play!")
        return;
    }

    runFlag = 1 - runFlag;
    if(runFlag) {
        document.getElementById("runDrawingBtn").innerHTML = "<i class='fas fa-pause'></i>";
        changeSpeed();
    } else {
        document.getElementById("runDrawingBtn").innerHTML = "<i class='fas fa-play'></i>";
        clearInterval(interval);
        return;
    }


    let drawingJsonStr = "";

    fetch(txtUrl, {
        // headers: {
        //     'Access-Control-Allow-Origin': '*',
        //     'Access-Control-Allow-Credentials': true
        // },
        // mode: "cors"
    })
    .then(function(response) {
        response.text().then(function(text) {
            drawingJsonStr = text;
            done();
        });
    });

    function done() {
        //document.getElementById("statusText").innerHTML = "";
        drawings = JSON.parse(drawingJsonStr);
        changeSpeed();
        console.log(drawings);
    }
}
function stopDrawing() {
    clearDrawing();
    prevX = 0, prevY = 0;
    drawing_index = 0;
    runFlag = 0;
    document.getElementById("runDrawingBtn").innerHTML = "<i class='fas fa-play'></i>";
    clearInterval(interval);
}
function playCanvas() {
    if(drawings && drawings[drawing_index])
    {
        playOnCanvas(drawings[drawing_index]);
        drawing_index ++;
    }
}
function changeSpeed() {
    //Speed might be 2000 - 100,000
    let speed = document.getElementById("playSpeed").value;

    let pointCount = Object.keys(drawings).length;
    //console.log(pointCount);
    //alert(pointCount);
    // if(pointCount / 100 <= speed) {
    //     alert("Instant");
    //     clearInterval(interval);
    //     interval = setInterval(playCanvas, 10);
    // } else {
    clearInterval(interval);
    interval = setInterval(playCanvas, (11 - speed) * 2 - 1);
    // }
}
function rrunDrawing() {
    alert("r");
}



function updateImage() {
    var newImageURL = document.getElementById("imageURL").value;
    var img = document.getElementById("photoToDraw");
    // console.log("img")
    // console.log(img)
    // console.log("newImageURL")
    // console.log(newImageURL)

    //start send image
    base('Images').create([{
        "fields": {
            "Image_File": [{
                "url": newImageURL
            }]
        }
    }

], function(err, records) {
    if (err) {
        console.log("new error");
        console.error(err);
        return;
    }
    records.forEach(function(record) {
        image_RecordID=record.getId();
    });
});


img.src = newImageURL;
}

function updateImageWidth() {
    var newImageWidth = document.getElementById("imageWidth").value;
    var img2 = document.getElementById("photoToDraw");
    img2.width = newImageWidth;
}

// var backgroundImageInputElement = document.getElementById("imageURL");
// backgroundImageInputElement.addEventListener("keypress", updateImage);

// var penWidthInputElement = document.getElementById("imageWidth");
// penWidthInputElement.addEventListener("keypress", updateImageWidth);
