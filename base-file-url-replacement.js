const fs = require('fs');

const hostingUrl = fs.readFileSync("hostingUrl.txt", 'utf8');
const baseSamlingHtml = fs.readFileSync("samling.html", 'utf8');
const newSamlingHtml = baseSamlingHtml.replace(/_HOSTING_URL_/g, hostingUrl);

fs.writeFileSync("public/samling.html", newSamlingHtml, 'utf8')

const meta = fs.readFileSync('./metadata.xml.tpl', 'utf8');
const cert = fs.readFileSync('cert.pem').toString('utf8')
const flatCert = cert.replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "").replace(/[\s]/g, "");
const metadataXml = meta.replace("_CERTIFICATE_", flatCert).replace(/_HOSTING_URL_/g, hostingUrl);

fs.writeFileSync("./public/metadata.xml", metadataXml, 'utf8');
