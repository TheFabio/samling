import fs from 'fs';

const hostingUrl = process.env.npm_config_hosting_url;
fs.writeFileSync(".tmp/hostingUrl.txt", hostingUrl, 'utf8')

const baseIndexHtml = fs.readFileSync("dist/index.html", 'utf8');
const newIndexHtml = baseIndexHtml.replace(/_HOSTING_URL_/g, hostingUrl);
fs.writeFileSync("dist/index.html", newIndexHtml, 'utf8')

const meta = fs.readFileSync('src/samling/metadata.xml.tpl', 'utf8');
const cert = fs.readFileSync('src/samling/cert.pem').toString('utf8')
const flatCert = cert.replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "").replace(/[\s]/g, "");
const metadataXml = meta.replace("_CERTIFICATE_", flatCert).replace(/_HOSTING_URL_/g, hostingUrl);

fs.writeFileSync("dist/metadata.xml", metadataXml, 'utf8');
