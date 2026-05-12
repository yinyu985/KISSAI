export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname.startsWith('/api/proxy/')) {
            return handleProxyRequest(request, url);
        }

        return env.ASSETS.fetch(request);
    }
};

async function handleProxyRequest(request, url) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders()
        });
    }

    const baseUrl = request.headers.get('x-base-url');

    if (!baseUrl) {
        return json({ error: 'Missing x-base-url' }, 400);
    }

    let upstreamUrl;

    try {
        const path = url.pathname.slice('/api/proxy/'.length);
        upstreamUrl = buildUpstreamUrl(baseUrl, path);
    } catch {
        return json({ error: 'Invalid x-base-url' }, 400);
    }

    if (upstreamUrl.protocol !== 'https:') {
        return json({ error: 'Only HTTPS upstream is allowed' }, 400);
    }

    if (isUnsafeHostname(upstreamUrl.hostname)) {
        return json({ error: 'Unsafe upstream hostname' }, 403);
    }

    const headers = buildUpstreamHeaders(request);

    let upstreamResponse;

    try {
        upstreamResponse = await fetch(upstreamUrl.toString(), {
            method: request.method,
            headers,
            body: ['GET', 'HEAD'].includes(request.method)
                ? undefined
                : request.body,
            redirect: 'follow'
        });
    } catch {
        return json({ error: 'Failed to fetch upstream' }, 502);
    }

    const responseHeaders = new Headers(upstreamResponse.headers);

    for (const [key, value] of Object.entries(corsHeaders())) {
        responseHeaders.set(key, value);
    }

    return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders
    });
}

function buildUpstreamUrl(baseUrl, path) {
    const upstreamUrl = new URL(baseUrl);
    const basePath = upstreamUrl.pathname.replace(/\/+$/, '');
    const upstreamPath = String(path || '').replace(/^\/+/, '');

    upstreamUrl.pathname = upstreamPath
        ? `${basePath}/${upstreamPath}`
        : basePath || '/';

    return upstreamUrl;
}

function buildUpstreamHeaders(request) {
    const headers = new Headers();

    const authorization = request.headers.get('authorization');
    const contentType = request.headers.get('content-type');
    const accept = request.headers.get('accept');

    if (authorization) {
        headers.set('authorization', authorization);
    }

    if (contentType) {
        headers.set('content-type', contentType);
    }

    if (accept) {
        headers.set('accept', accept);
    }

    return headers;
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, authorization, x-base-url',
        'Access-Control-Expose-Headers': 'content-type'
    };
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            ...corsHeaders()
        }
    });
}

function isUnsafeHostname(hostname) {
    const h = hostname.toLowerCase();

    return (
        h === 'localhost' ||
        h === '127.0.0.1' ||
        h === '0.0.0.0' ||
        h === '::1' ||
        h.endsWith('.local')
    );
}
