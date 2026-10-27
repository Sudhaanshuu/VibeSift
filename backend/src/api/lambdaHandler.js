import { app } from './app.js';

/**
 * Serverless Lambda event adapter for API Gateway HTTP / REST APIs
 */
export async function handler(event, context) {
  // If invoked as warm-up ping
  if (event.source === 'aws.events' || event.ping) {
    return { statusCode: 200, body: 'pong' };
  }

  return new Promise((resolve, reject) => {
    // Map API Gateway event to Node HTTP request
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const path = event.path || event.rawPath || '/';
    const headers = event.headers || {};
    const queryStringParameters = event.queryStringParameters || {};

    let body = event.body;
    if (event.isBase64Encoded && body) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }

    const req = {
      method,
      url: path,
      originalUrl: path,
      path,
      headers: Object.keys(headers).reduce((acc, k) => {
        acc[k.toLowerCase()] = headers[k];
        return acc;
      }, {}),
      query: queryStringParameters,
      body: body && typeof body === 'string' ? (headers['content-type']?.includes('json') ? JSON.parse(body) : body) : body || {},
    };

    let statusCode = 200;
    const responseHeaders = {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    };
    let responseBody = '';

    const res = {
      statusCode: 200,
      setHeader(name, val) {
        responseHeaders[name.toLowerCase()] = val;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseHeaders['content-type'] = 'application/json';
        responseBody = JSON.stringify(data);
        this.send(responseBody);
      },
      send(data) {
        responseBody = typeof data === 'string' ? data : JSON.stringify(data);
        resolve({
          statusCode,
          headers: responseHeaders,
          body: responseBody,
        });
      },
      end() {
        resolve({
          statusCode,
          headers: responseHeaders,
          body: responseBody,
        });
      },
    };

    // Dispatch to Express
    try {
      app(req, res);
    } catch (err) {
      resolve({
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: err.message, code: 'LAMBDA_DISPATCH_ERROR' }),
      });
    }
  });
}
