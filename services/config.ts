/**
 * @license
 * SPDX-License-Identifier: MIT
 */

/**
 * Single source of truth for the Flask backend's base URL.
 *
 * Resolution order:
 *   1. BACKEND_URL from the build environment (see .env.example / vite.config.ts)
 *   2. Empty string on localhost, so requests go through the Vite dev proxy
 *   3. http://<current-host>:5000 when the dashboard is opened from another
 *      device on the same LAN (e.g. a phone scanning the QR code)
 */

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const getApiBase = (): string => {
    const configured = process.env.BACKEND_URL;
    if (configured) {
        return stripTrailingSlash(configured);
    }

    const { hostname } = window.location;

    // Local development: let the Vite proxy forward /api to 127.0.0.1:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '';
    }

    // Same-LAN access (phone/laptop hitting the dev machine's IP)
    return `http://${hostname}:5000`;
};

export const API_BASE = getApiBase();
