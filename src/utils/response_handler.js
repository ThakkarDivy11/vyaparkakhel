// Signature used by controllers: (res, data, message, status)
//   res     - express response
//   data    - object placed under `data` key in the JSON body (e.g. { game })
//   message - human-readable message string
//   status  - HTTP status code (number)
//
// Body shape: { status: 'success'|'failure', data: {...}, message: '...' }
function responseHandler(res, data = {}, message, status = 200) {
  const body = {
    status: String(status).startsWith('2') ? 'success' : 'failure',
    data,
  };
  if (message) body.message = message;
  return res.status(status).json(body);
}

module.exports = responseHandler;
