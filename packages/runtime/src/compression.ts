import { createBrotliCompress, createGzip, type BrotliCompress, type Gzip } from 'node:zlib';
import type { ServerResponse } from 'node:http';

const COMPRESS_THRESHOLD = 1024;

const SKIP_CONTENT_TYPES = new Set([
  'image/',
  'audio/',
  'video/',
  'application/zip',
  'application/gzip',
  'application/x-bzip',
  'application/x-bzip2',
  'application/x-xz',
  'application/zstd',
  'application/octet-stream',
]);

function shouldSkipContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }

  const lower = contentType.toLowerCase();

  for (const prefix of SKIP_CONTENT_TYPES) {
    if (lower.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

type Encoding = 'br' | 'gzip' | 'identity';

function selectEncoding(acceptEncoding: string | undefined): Encoding {
  if (!acceptEncoding) {
    return 'identity';
  }

  const entries = acceptEncoding
    .split(',')
    .map((entry) => {
      const [enc, qPart] = entry.trim().split(';');
      const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1;

      return { enc: enc?.trim() ?? '', q: isNaN(q) ? 1 : q };
    })
    .filter((e) => e.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { enc } of entries) {
    if (enc === 'br') {
      return 'br';
    }

    if (enc === 'gzip') {
      return 'gzip';
    }
  }

  return 'identity';
}

export function compressResponse(
  response: ServerResponse,
  body: Buffer,
  acceptEncoding: string | undefined,
  contentType: string | undefined,
): Promise<void> {
  if (body.length < COMPRESS_THRESHOLD || shouldSkipContentType(contentType)) {
    return new Promise<void>((resolve, reject) => {
      response.end(body, () => { resolve(); });
      response.once('error', reject);
    });
  }

  const encoding = selectEncoding(acceptEncoding);

  if (encoding === 'identity') {
    return new Promise<void>((resolve, reject) => {
      response.end(body, () => { resolve(); });
      response.once('error', reject);
    });
  }

  const stream: BrotliCompress | Gzip = encoding === 'br' ? createBrotliCompress() : createGzip();

  response.setHeader('Content-Encoding', encoding);
  response.removeHeader('Content-Length');

  return new Promise((resolve, reject) => {
    stream.on('error', reject);

    stream.pipe(response);
    stream.on('finish', resolve);

    stream.end(body);
  });
}
