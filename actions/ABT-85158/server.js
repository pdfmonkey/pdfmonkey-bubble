async function(properties, context) {
  const makeMapping = (arrayOfKeysAndValues) => {
    if (arrayOfKeysAndValues === undefined || arrayOfKeysAndValues === null || arrayOfKeysAndValues.length === 0) {
      return {};
    }

    return arrayOfKeysAndValues.reduce((obj, { key, value }) => { obj[key] = value; return obj; }, {});
  };

  const apiKey = context.keys['API Key'];
  const templateId = properties.templateId;
  const filename = properties.filename;
  const meta = makeMapping(properties.meta);
  const payload = makeMapping(properties.payload);

  if (!meta._filename && typeof filename === 'string') {
    meta._filename = filename;
  }

  let response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Bubble'
    },
    body: JSON.stringify({
      document: {
        document_template_id: templateId,
        meta: JSON.stringify(meta),
        payload: JSON.stringify(payload),
        status: 'pending'
      }
    })
  });

  let json = await response.json();

  if (json.error) {
    return json.error;
  }

  if (json.errors) {
    if (json.errors[0]?.detail) {
      return json.errors[0].detail;
    }
    else {
      return JSON.stringify(json.errors);
    }
  }

  let documentId = json.document.id;
  let documentStatus;

  while (documentStatus != 'success' && documentStatus != 'failure') {
    response = await fetch(`https://api.pdfmonkey.io/api/v1/document_cards/${documentId}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Bubble'
      }
    });

    json = await response.json();

    if (json.error) {
      return json.error;
    }
    if (json.errors) {
      if (json.errors[0]?.detail) {
        return json.errors[0].detail;
      }
      else {
        return JSON.stringify(json.errors);
      }
    }

    documentStatus = json.document_card.status;
  }

  let documentCard = json.document_card;

  return {
    id: documentCard.id,
    downloadUrl: documentCard.download_url,
    publicShareLink: documentCard.public_share_link,
    filename: documentCard.filename,
    meta: documentCard.meta,
    status: documentCard.status,
    failureCause: documentCard.failure_cause,
    createdAt: documentCard.created_at,
    updatedAt: documentCard.updated_at
  };
}