const fs = require('fs');
window.CLIPBOARDJS = require('clipboard-js');
window.SAML = require('./saml');
const COOKIE_NAME = 'samling';
const meta = fs.readFileSync('./metadata.xml.tpl').toString("utf8");
const hostingUrl = fs.readFileSync('./hostingUrl.txt').toString("utf8");

const queryParams = {};

function deleteCookie() {
  document.cookie = COOKIE_NAME + '=' + ';path=/;expires=' + (new Date(1));
}

function logout() {
  if (queryParams["manual"]) {
    delete queryParams["manual"];
    $('#navbarSamling a[href="#userDetailsTab"]').tab('show');
    return;
  }

  deleteCookie();
  const response = $('#samlResponse').val();
  const callbackUrl = $('#callbackUrl').val();
  if (response && callbackUrl) {
    const options = {
      key: $('#signatureKey').val().trim(),
      cert: $('#signatureCert').val().trim()
    };
    const samlResponse = window.SAML.signDocument(response, "//*[local-name(.)='LogoutResponse']", options);
    $('#samlResponse').val(btoa(samlResponse.getSignedXml()));
    const form = $('#samlResponseForm')[0];
    form.action = callbackUrl;
    form.submit();
  } else {
    location.href = location.href.replace(location.search, '');
  }
}

function handleRequest(request, relayState) {
  // parse the saml request
  window.SAML.parseRequest({issuer: $('#issuer').val().trim(), callbackUrl: $('#callbackUrl').val().trim()}, request, function(info) {
    if (relayState) {
      $('#relayState').val(decodeURIComponent(relayState));
    }

    if (info.logout) {
      $('#samlResponse').val(info.logout.response);
      $('#callbackUrl').val(info.logout.callbackUrl);
      $('#callbackUrlReadOnly').val(info.logout.callbackUrl);
      logout();
      return;
    }

    // populate fields from the request
    $('#authnContextClassRef').val(info.login.authnContextClassRef);
    $('#nameIdentifierFormat').val(info.login.nameIdentifierFormat);
    $('#callbackUrl').val(info.login.callbackUrl);
    $('#callbackUrlReadOnly').val(info.login.callbackUrl);
    $('#issuer').val(info.login.destination);
    $('#audience').val(info.login.issuer);
    $('#inResponseTo').val(info.login.id);
    
    // auto-login if:
    // 1. ForceAuthn="true" was not specified on the authentication request
    // 2. we also have the username already populated because of the samling cookie
    if (!info.login.forceAuthn && $('#signedInUser').text().trim().length > 0) {
      $('#createResponse').trigger('click');
      setTimeout(function() {
        $('#postSAMLResponse').trigger('click');
      }, 100);
    }
  });
}

function _getSessionExpiration(format) {
  const sessionDuration = $('#sessionDuration').val().trim();
  if (sessionDuration.length === 0) {
      $('#sessionDurationControl').addClass('has-error');
      !error && $('#sessionDuration').focus();
      error = true;
    } else if (!sessionDuration.match(/^\d+$/)) {
      error && $('#sessionDuration').focus();
      error = true;
    }
  return new Date(Date.now() + parseInt(sessionDuration) * 1000 * 60)["to"+format+"String"]();
}

function _updateMetadata(cert) {
  var flatCert = cert.toString().replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "").replace(/[\s]/g, "");
  $('#idpMetadata').text(meta.replace("_CERTIFICATE_", flatCert).replace(/_HOSTING_URL_/g, hostingUrl));
}

$(function() {

  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover();

  const cert = localStorage.getItem('certVal') || fs.readFileSync('./cert.pem').toString("utf8");
  $('#signatureCert').val(cert);
  $('#signatureKey').val(localStorage.getItem('privateKeyVal') || fs.readFileSync('./key.pem').toString("utf8"));
  _updateMetadata(cert);

  const params = location.search.split('?');
  if (params.length > 1) {
    const parts = params[1].split('&');
    parts.forEach(function(part) {
      const keyval = part.split('=');
      queryParams[keyval[0]] = keyval[1];
    });
  }

  const userControl = $('#signedInUser');
  const cookies = document.cookie.split(';');
  cookies.forEach(function(cook) {
    const parts = cook.split('=');
    if (parts[0].trim() === COOKIE_NAME) {
      try {
        const value = atob(parts[1].trim());
        const data = JSON.parse(value);
        userControl.text('Hello ' + data.nameIdentifier);
        $('#signedInAt').text(data.signedInAt);
        $('#nameIdentifier').val(data.nameIdentifier);
        $('#callbackUrl').val(data.callbackUrl);
        $('#callbackUrlReadOnly').val(data.callbackUrl);
        $('#issuer').val(data.issuer);
        $('#authnContextClassRef').val(data.authnContextClassRef);
        $('#nameIdentifierFormat').val(data.nameIdentifierFormat);
        $('#samlAttributes').val(data.attributes);
        $('#inResponseTo').val(data.id);
         } catch (e) {
        $('#signedInAt').text('ERROR: ' + e.message);
      }
    }
  });

  $('#copyMetadata').click(function() {
    window.CLIPBOARDJS.copy($('#idpMetadata').text());
    $('#copyMetadata').tooltip('show');
    setTimeout(function() {
      $('#copyMetadata').tooltip('hide');
    }, 1500);
  });

  $('#copyResponseToClipboard').click(function() {
    window.CLIPBOARDJS.copy($('#samlResponse').val());
    $('#copyResponseToClipboard').tooltip('show');
    setTimeout(function() {
      $('#copyResponseToClipboard').tooltip('hide');
    }, 1500);
  });

  $('#signedInLogout').click(function() {
    logout();
  });

  $('#generateKeyAndCert').click(function() {
    const pki = window.forge.pki;
    const keypair = pki.rsa.generateKeyPair({bits: 1024});
    const cert = pki.createCertificate();
    cert.publicKey = keypair.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    const attrs = [{
      name: 'commonName',
      value: 'capriza.com'
    }, {
      name: 'countryName',
      value: 'US'
    }, {
      shortName: 'ST',
      value: 'Virginia'
    }, {
      name: 'localityName',
      value: 'Blacksburg'
    }, {
      name: 'organizationName',
      value: 'Samling'
    }, {
      shortName: 'OU',
      value: 'Samling'
    }];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    }, {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true
    }, {
      name: 'subjectAltName',
      altNames: [{
        type: 6, // URI
        value: 'http://capriza.com/samling'
      }]
    }, {
      name: 'subjectKeyIdentifier'
    }]);
    // self-sign certificate
    cert.sign(keypair.privateKey);
    // convert to PEM
    const certVal = pki.certificateToPem(cert);
    const privateKeyVal = pki.privateKeyToPem(keypair.privateKey);
    $('#signatureCert').val(certVal);
    $('#signatureKey').val(privateKeyVal);
  });

  $('#saveKeyAndCert').click(function() {
    const cert = $('#signatureCert').val().trim();
    localStorage.setItem('certVal', cert);
    localStorage.setItem('privateKeyVal', $('#signatureKey').val().trim());
    _updateMetadata(cert);
  });

  $('#createResponse').click(function() {
    $('#nameIdentifierControl').removeClass('has-error');
    $('#callbackUrlControl').removeClass('has-error');
    $('#signatureKeyControl').removeClass('has-error');
    $('#signatureCertControl').removeClass('has-error');

    let error = false;
    if ($('#nameIdentifier').val().trim().length === 0) {
      $('#nameIdentifierControl').addClass('has-error');
      !error && $('#nameIdentifier').focus();
      error = true;
    }

    if ($('#callbackUrl').val().trim().length === 0) {
      $('#callbackUrlControl').addClass('has-error');
      !error && $('#callbackUrl').focus();
      error = true;
    }

    if ($('#signatureKey').val().trim().length === 0) {
      $('#signatureKeyControl').addClass('has-error');
      !error && $('#signatureKey').focus();
      error = true;
    }

    if ($('#signatureCert').val().trim().length === 0) {
      $('#signatureCertControl').addClass('has-error');
      !error && $('#signatureCert').focus();
      error = true;
    }

    if (error) {
      return;
    }

    let attributes = undefined;
    const attributesStr = $('#samlAttributes').val().trim();
    if (attributesStr.length > 0) {
      attributes = {};
      attributesStr.split('\n').forEach(function(line) {
        var line = line.split('=');
        const name = line.shift().trim();
        if (name.length > 0) {
          const value = line.join('=').trim();
          if (attributes[name]) {
            attributes[name].push(value);
          } else {
            attributes[name] = [value];
          }
        }
      });
    }

    const options = {
      key: $('#signatureKey').val().trim(),
      cert: $('#signatureCert').val().trim(),
      issuer: $('#issuer').val().trim(),
      recipient: $('#callbackUrl').val().trim(),
      audiences: $('#audience').val().trim(),
      inResponseTo: $('#inResponseTo').val().trim(),
      authnContextClassRef: $('#authnContextClassRef').val().trim(),
      nameIdentifierFormat: $('#nameIdentifierFormat').val().trim(),
      nameIdentifier: $('#nameIdentifier').val().trim(),
      sessionExpiration: _getSessionExpiration("ISO"),
      sessionIndex: ('_samling_' + (Math.random() * 10000000)).replace('.', '_'),
      lifetimeInSeconds: $('#lifetimeInSeconds').val().trim(),
      attributes: attributes
    };
    const assertion = window.SAML.createAssertion(options);
    const callbackUrl = $('#callbackUrl').val().trim();
    const response = window.SAML.createResponse({
      instant: new Date().toISOString().trim(),
      issuer: $('#issuer').val().trim(),
      inResponseTo: $('#inResponseTo').val().trim(),
      destination: callbackUrl,
      assertion: assertion,
      samlStatusCode: $('#samlStatusCode').val().trim(),
      samlStatusMessage: $('#samlStatusMessage').val().trim(),
      signResponse: $('#signResponse').is(":checked") ? options : undefined,
    });

    $('#samlResponse').val(response);
    $('#callbackUrlReadOnly').val(callbackUrl);
    $('#navbarSamling a[href="#samlResponseTab"]').tab('show')
  });

  $('#postSAMLResponse').click(function(event) {
    event.preventDefault();
    $('#samlResponseControl').removeClass('has-error');
    $('#sessionDurationControl').removeClass('has-error');
    $('#callbackUrlControl').removeClass('has-error');

    let error = false;

    const samlResponse = $('#samlResponse').val().trim();
    if (samlResponse.length === 0) {
      $('#samlResponseControl').addClass('has-error');
      !error && $('#samlResponse').focus();
      error = true;
    }
    $('#samlResponse').val(btoa(samlResponse));

    const callbackUrl = $('#callbackUrl').val().trim();
    if (callbackUrl.length === 0) {
      $('#callbackUrlControl').addClass('has-error');
      !error && $('#callbackUrl').focus();
      error = true;
    }

    if (error) {
      return;
    }

    // write the "login" cookie
    const cookieData = {
      signedInAt: new Date().toUTCString(),
      nameIdentifier: $('#nameIdentifier').val().trim(),
      callbackUrl: $('#callbackUrl').val().trim(),
      issuer: $('#issuer').val().trim(),
      authnContextClassRef: $('#authnContextClassRef').val().trim(),
      nameIdentifierFormat: $('#nameIdentifierFormat').val().trim(),
      attributes: $('#samlAttributes').val().trim()
    };
    const cookieValue = btoa(JSON.stringify(cookieData));
    deleteCookie();
    document.cookie = COOKIE_NAME + '=' + cookieValue + ';path=/;expires=' + _getSessionExpiration("UTC");

    const form = $('#samlResponseForm')[0];
    form.action = callbackUrl;
    form.submit();
  });

  if (queryParams['SAMLRequest']) {
    handleRequest(queryParams['SAMLRequest'], queryParams['RelayState']);
  }

});

