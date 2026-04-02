export type LinkPreviewMetadata = {
    title: string | null;
    description: string | null;
    preview_image_url: string | null;
    site_name: string | null;
};

const EMPTY_PREVIEW: LinkPreviewMetadata = {
    title: null,
    description: null,
    preview_image_url: null,
    site_name: null,
};

function toCleanText(value: string | null | undefined) {
    if (!value) return null;

    return value
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTagContent(html: string, tag: string) {
    const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const matched = html.match(pattern);
    return toCleanText(matched?.[1]);
}

function extractMetaContent(html: string, keys: string[]) {
    for (const key of keys) {
        const escapedKey = escapeRegex(key);
        const patterns = [
            new RegExp(
                `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]*content=["']([^"']+)["'][^>]*>`,
                'i'
            ),
            new RegExp(
                `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escapedKey}["'][^>]*>`,
                'i'
            ),
        ];

        for (const pattern of patterns) {
            const matched = html.match(pattern);
            const content = toCleanText(matched?.[1]);
            if (content) return content;
        }
    }

    return null;
}

function toAbsoluteHttpUrl(value: string | null, baseUrl: string) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed, baseUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

export function toRequiredHttpUrl(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }
        return parsed.toString();
    } catch {
        return null;
    }
}

export function toNullableString(value: unknown) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function getUrlHostnameLabel(url: string) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./i, '');
    } catch {
        return 'Website';
    }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewMetadata> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'User-Agent': 'ApplyHub-LinkPreview/1.0',
            },
        });

        if (!response.ok) {
            return EMPTY_PREVIEW;
        }

        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        if (!contentType.includes('text/html')) {
            return EMPTY_PREVIEW;
        }

        const html = (await response.text()).slice(0, 220_000);
        const resolvedUrl = response.url || url;

        const title = extractMetaContent(html, ['og:title', 'twitter:title']) ?? extractTagContent(html, 'title');
        const description = extractMetaContent(html, ['og:description', 'twitter:description', 'description']);
        const imageRaw = extractMetaContent(html, ['og:image', 'twitter:image']);
        const siteName = extractMetaContent(html, ['og:site_name']);

        return {
            title,
            description,
            preview_image_url: toAbsoluteHttpUrl(imageRaw, resolvedUrl),
            site_name: siteName,
        };
    } catch {
        return EMPTY_PREVIEW;
    } finally {
        clearTimeout(timeoutId);
    }
}
