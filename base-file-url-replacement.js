const fs = require('fs');

fs.readFile("hostingUrl.txt", 'utf8', (err1, hostingUrl) => {
    if (err1) return console.log(err1);

    fs.readFile("samling.html", 'utf8', (err2, samlingHtml) => {
        if (err2) return console.log(err2);

        const newSamlingHtml = samlingHtml.replace(/SAMLING_URL/g, hostingUrl);

        fs.writeFile("public/samling.html", newSamlingHtml, 'utf8', function (err) {
            if (err) return console.log(err);
        });
    })
});