/* Jellyfin Remove NextUp Items ClientSide 0.9 from github.com/Damocles-fr */
/* Manual console restore : window.NextUpHideRestoreAll() */
/* Dump : window.NextUpHideDump() */
/* Force refresh : window.NextUpHideRefresh() */
/* local storage key : jf-nextup-hider:v6:<serverAddress>:<userId> */
(function () {
    'use strict';

    const CONFIG = {
        title: 'Jellyfin Remove NextUp Items ClientSide 1.0',
        storageNamespace: 'jf-nextup-hider:v6',
        styleId: 'jf-nextup-hider-style-v6',
        nextUpLimit: 1000,
        refreshIntervalMs: 15000,
        watchDogMs: 800,
        reapplyDelayMs: 220,
        debug: false
    };

    const state = {
        nextUpEpisodeIds: new Set(),
        seriesByEpisodeId: new Map(),
        hiddenSeriesIds: new Set(),
        hiddenEpisodeIds: new Set(),
        observer: null,
        refreshTimer: null,
        watchDogTimer: null,
        bootTimer: null,
        scheduledRun: null,
        pendingRefresh: false,
        runSeq: 0,
        lastRouteKey: ''
    };

    function log() {
        if (!CONFIG.debug) return;
        console.log.apply(console, ['[JF-NextUpHide]'].concat(Array.from(arguments)));
    }

    function warn() {
        console.warn.apply(console, ['[JF-NextUpHide]'].concat(Array.from(arguments)));
    }

    function getApiClient() {
        return window.ApiClient || null;
    }

    function getUserId() {
        const api = getApiClient();
        return api && (api.getCurrentUserId && api.getCurrentUserId()) || api && api._currentUser && api._currentUser.Id || null;
    }

    function getAccessToken() {
        const api = getApiClient();
        return api && api.accessToken && api.accessToken() || null;
    }

    function getServerAddress() {
        const api = getApiClient();
        return api && api.serverAddress && api.serverAddress() || api && api._serverAddress || window.location.origin;
    }

    function getAuthHeaders() {
        const headers = { Accept: 'application/json' };
        const token = getAccessToken();

        if (token) {
            headers.Authorization = 'MediaBrowser Token="' + token + '"';
        }

        return headers;
    }

    function getStorageKey() {
        const userId = getUserId();
        const serverAddress = getServerAddress();

        if (!userId || !serverAddress) return null;
        return CONFIG.storageNamespace + ':' + serverAddress + ':' + userId;
    }

    function loadHiddenState() {
        state.hiddenSeriesIds = new Set();
        state.hiddenEpisodeIds = new Set();

        const key = getStorageKey();
        if (!key) return;

        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;

            const parsed = JSON.parse(raw);
            const hiddenSeriesIds = Array.isArray(parsed && parsed.hiddenSeriesIds) ? parsed.hiddenSeriesIds : [];
            const hiddenEpisodeIds = Array.isArray(parsed && parsed.hiddenEpisodeIds) ? parsed.hiddenEpisodeIds : [];

            state.hiddenSeriesIds = new Set(hiddenSeriesIds.filter(Boolean));
            state.hiddenEpisodeIds = new Set(hiddenEpisodeIds.filter(Boolean));
        } catch (error) {
            warn('Failed to load hidden state.', error);
        }
    }

    function saveHiddenState() {
        const key = getStorageKey();
        if (!key) return;

        try {
            localStorage.setItem(key, JSON.stringify({
                hiddenSeriesIds: Array.from(state.hiddenSeriesIds),
                hiddenEpisodeIds: Array.from(state.hiddenEpisodeIds)
            }));
        } catch (error) {
            warn('Failed to save hidden state.', error);
        }
    }

    function clearHiddenState() {
        state.hiddenSeriesIds.clear();
        state.hiddenEpisodeIds.clear();
        saveHiddenState();
    }

    function getRestoreCount() {
        return state.hiddenSeriesIds.size || state.hiddenEpisodeIds.size;
    }

    function isVisible(element) {
        if (!element || !element.isConnected) return false;

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;

        const rect = element.getBoundingClientRect();
        return rect.width > 2 && rect.height > 2;
    }

    function injectStyle() {
        if (document.getElementById(CONFIG.styleId)) return;

        const style = document.createElement('style');
        style.id = CONFIG.styleId;
        style.textContent = `
            .jf-nextup-hide-anchor{
                position:relative !important;
            }

            .jf-nextup-hide-layer{
                position:absolute !important;
                inset:0 !important;
                pointer-events:none !important;
                z-index:12 !important;
            }

            .jf-nextup-hide-button{
                position:absolute !important;
                top:8px !important;
                right:8px !important;
                width:32px !important;
                height:32px !important;
                min-width:32px !important;
                min-height:32px !important;
                padding:0 !important;
                margin:0 !important;
                border:none !important;
                border-radius:999px !important;
                display:flex !important;
                align-items:center !important;
                justify-content:center !important;
                pointer-events:auto !important;
                cursor:pointer !important;
                background:rgba(0,0,0,.72) !important;
                color:#fff !important;
                opacity:0 !important;
                transform:scale(.84) !important;
                transition:opacity .16s ease, transform .16s ease, background .16s ease !important;
                box-shadow:0 2px 8px rgba(0,0,0,.28) !important;
                backdrop-filter:blur(2px) !important;
                z-index:13 !important;
                box-sizing:border-box !important;
                line-height:1 !important;
            }

            .jf-nextup-hide-anchor:hover .jf-nextup-hide-button,
            .jf-nextup-hide-anchor:focus-within .jf-nextup-hide-button{
                opacity:1 !important;
                transform:scale(1) !important;
            }

            .jf-nextup-hide-button:hover,
            .jf-nextup-hide-button:focus-visible{
                background:rgba(220,38,38,.92) !important;
                transform:scale(1.08) !important;
                outline:none !important;
            }

            .jf-nextup-hide-button:disabled{
                opacity:.72 !important;
                transform:scale(.94) !important;
                cursor:not-allowed !important;
            }

            .jf-nextup-hide-button svg{
                width:18px !important;
                height:18px !important;
                display:block !important;
                pointer-events:none !important;
                flex:0 0 auto !important;
            }

            @media (hover:none), (pointer:coarse){
                .jf-nextup-hide-button{
                    opacity:.92 !important;
                    transform:scale(1) !important;
                }
            }

            .jf-nextup-restore-button{
                display:inline-flex !important;
                align-items:center !important;
                justify-content:center !important;
                width:28px !important;
                height:28px !important;
                min-width:28px !important;
                min-height:28px !important;
                margin-left:.45rem !important;
                padding:0 !important;
                border:none !important;
                border-radius:999px !important;
                background:transparent !important;
                color:inherit !important;
                cursor:pointer !important;
                opacity:.82 !important;
                vertical-align:middle !important;
                box-sizing:border-box !important;
                position:relative !important;
                z-index:2 !important;
                line-height:1 !important;
                flex:0 0 auto !important;
            }

            .jf-nextup-restore-button:hover,
            .jf-nextup-restore-button:focus-visible{
                opacity:1 !important;
                background:rgba(255,255,255,.07) !important;
                outline:none !important;
            }

            .jf-nextup-restore-button svg{
                width:17px !important;
                height:17px !important;
                display:block !important;
                pointer-events:none !important;
                flex:0 0 auto !important;
            }
        `;

        document.head.appendChild(style);
    }

    async function fetchJson(url) {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ' ' + response.statusText);
        }

        return response.json();
    }

    async function refreshNextUpIndex() {
        const userId = getUserId();
        const serverAddress = getServerAddress();

        if (!userId || !serverAddress) return;

        const baseUrl = serverAddress.replace(/\/$/, '');
        const url = new URL(baseUrl + '/Shows/NextUp');
        url.searchParams.set('userId', userId);
        url.searchParams.set('limit', String(CONFIG.nextUpLimit));
        url.searchParams.set('enableUserData', 'false');
        url.searchParams.set('enableTotalRecordCount', 'false');
        url.searchParams.set('enableResumable', 'false');
        url.searchParams.set('enableRewatching', 'false');

        const data = await fetchJson(url.toString());
        const items = Array.isArray(data && data.Items) ? data.Items : [];

        state.nextUpEpisodeIds = new Set();
        state.seriesByEpisodeId = new Map();

        items.forEach(function (item) {
            if (!item || !item.Id) return;
            state.nextUpEpisodeIds.add(item.Id);

            const seriesId = item.SeriesId || item.Series && item.Series.Id || item.Series && item.Series.id || null;
            if (seriesId) {
                state.seriesByEpisodeId.set(item.Id, seriesId);
            }
        });
    }

    function getCardItemId(card) {
        return card && card.getAttribute && card.getAttribute('data-id') || null;
    }

    function getSeriesIdForEpisode(itemId) {
        return state.seriesByEpisodeId.get(itemId) || null;
    }

    function isEpisodeHidden(itemId) {
        if (!itemId) return false;
        if (state.hiddenEpisodeIds.has(itemId)) return true;

        const seriesId = getSeriesIdForEpisode(itemId);
        return !!seriesId && state.hiddenSeriesIds.has(seriesId);
    }

    function getAllNextUpCards() {
        return Array.from(document.querySelectorAll('.card[data-id]')).filter(function (card) {
            return state.nextUpEpisodeIds.has(getCardItemId(card));
        });
    }

    function getRowsWithNextUpCards() {
        const seen = new Set();
        const rows = [];

        getAllNextUpCards().forEach(function (card) {
            const row = card.closest('.itemsContainer') || card.parentElement;
            if (!row || seen.has(row)) return;
            seen.add(row);
            rows.push(row);
        });

        return rows;
    }

    function findMediaAnchor(card) {
        if (!card) return null;

        const selectors = [
            '.cardScalable',
            '.cardBox',
            '.cardImageContainer',
            '.cardContent'
        ];

        for (let i = 0; i < selectors.length; i += 1) {
            const match = card.querySelector(selectors[i]);
            if (match) return match;
        }

        return card;
    }

    function ensureHideLayer(anchor) {
        if (!anchor) return null;

        let layer = anchor.querySelector(':scope > .jf-nextup-hide-layer');
        if (!layer) {
            anchor.classList.add('jf-nextup-hide-anchor');
            layer = document.createElement('div');
            layer.className = 'jf-nextup-hide-layer';
            anchor.appendChild(layer);
        }

        const layers = anchor.querySelectorAll(':scope > .jf-nextup-hide-layer');
        if (layers.length > 1) {
            for (let i = 1; i < layers.length; i += 1) {
                layers[i].remove();
            }
        }

        return layer;
    }

    function hideNextUpItem(itemId, card) {
        const seriesId = getSeriesIdForEpisode(itemId);

        state.hiddenEpisodeIds.add(itemId);
        if (seriesId) {
            state.hiddenSeriesIds.add(seriesId);
        }

        saveHiddenState();

        if (card && card.isConnected) {
            card.remove();
        }

        scheduleRun(0, false);
    }

    function ensureHideButton(card) {
        const itemId = getCardItemId(card);
        if (!itemId) return;

        const anchor = findMediaAnchor(card);
        if (!anchor) return;

        const layer = ensureHideLayer(anchor);
        if (!layer) return;

        const existingButtons = layer.querySelectorAll('.jf-nextup-hide-button');
        if (existingButtons.length > 1) {
            for (let i = 1; i < existingButtons.length; i += 1) {
                existingButtons[i].remove();
            }
        }

        if (existingButtons[0]) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'jf-nextup-hide-button';
        button.setAttribute('data-action', 'none');
        button.setAttribute('data-jf-next-up-hide', '1');
        button.setAttribute('data-id', itemId);
        button.title = 'Hide from Next Up';
        button.setAttribute('aria-label', 'Hide from Next Up');
        button.innerHTML = [
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
            '<path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.71A1 1 0 1 0 5.7 7.12L10.59 12 5.71 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.88a1 1 0 0 0 0-1.41Z"/>',
            '</svg>'
        ].join('');

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            button.disabled = true;
            hideNextUpItem(itemId, card);
        });

        layer.appendChild(button);
    }

    function syncNextUpCards() {
        getAllNextUpCards().forEach(function (card) {
            const itemId = getCardItemId(card);
            if (!itemId) return;

            if (isEpisodeHidden(itemId)) {
                card.remove();
                return;
            }

            ensureHideButton(card);
        });
    }

    function findTitleReferenceForRow(row) {
        if (!row) return null;

        const titleSelectors = [
            '.sectionTitleTextButton',
            '.sectionTitle',
            '.sectionTitleText',
            '.headerTitle',
            '.pageTitle',
            'h1',
            'h2',
            'h3',
            'h4'
        ].join(',');

        let current = row;

        for (let depth = 0; current && depth < 7; depth += 1) {
            const parent = current.parentElement;
            if (!parent) break;

            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(current);

            for (let i = index - 1; i >= 0; i -= 1) {
                const sibling = siblings[i];
                if (!isVisible(sibling)) continue;

                const direct = sibling.matches && sibling.matches(titleSelectors) ? sibling : null;
                const nested = direct || Array.from(sibling.querySelectorAll ? sibling.querySelectorAll(titleSelectors) : []).find(isVisible);
                if (!nested) continue;

                return nested;
            }

            current = parent;
        }

        return null;
    }

    function removeRestoreButtons() {
        document.querySelectorAll('.jf-nextup-restore-button[data-jf-next-up-restore="1"]').forEach(function (node) {
            node.remove();
        });
    }

    function createRestoreButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'jf-nextup-restore-button';
        button.setAttribute('data-jf-next-up-restore', '1');
        button.title = 'Restore hidden Next Up';
        button.setAttribute('aria-label', 'Restore hidden Next Up');
        button.innerHTML = [
            '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
            '<path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6a6 6 0 1 1-10.24-4.24l-1.42-1.42A8 8 0 1 0 20 13c0-4.42-3.58-8-8-8Z"/>',
            '</svg>'
        ].join('');

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            const hiddenCount = getRestoreCount();
            if (!hiddenCount) return;

            const confirmed = window.confirm('Restore all hidden Next Up entries (' + hiddenCount + ')?');
            if (!confirmed) return;

            clearHiddenState();
            window.location.reload();
        });

        return button;
    }

    function updateRestoreButton() {
        removeRestoreButtons();

        if (!getRestoreCount()) return;

        const rows = getRowsWithNextUpCards();
        if (!rows.length) return;

        const titleRef = findTitleReferenceForRow(rows[0]);
        if (!titleRef || !titleRef.parentNode) return;

        const restoreButton = createRestoreButton();
        titleRef.insertAdjacentElement('afterend', restoreButton);
    }

    function processPage() {
        syncNextUpCards();
        updateRestoreButton();
    }

    function needsReapply() {
        if (getRestoreCount() > 0 && !document.querySelector('.jf-nextup-restore-button[data-jf-next-up-restore="1"]')) {
            return true;
        }

        const cards = getAllNextUpCards();
        for (let i = 0; i < cards.length; i += 1) {
            const card = cards[i];
            const itemId = getCardItemId(card);
            if (!itemId) continue;

            if (isEpisodeHidden(itemId)) {
                return true;
            }

            const anchor = findMediaAnchor(card);
            if (!anchor) return true;

            const buttons = anchor.querySelectorAll('.jf-nextup-hide-button');
            if (!buttons.length) return true;
            if (buttons.length > 1) return true;
        }

        return false;
    }

    async function run(refresh) {
        const mySeq = ++state.runSeq;

        injectStyle();
        loadHiddenState();

        if (refresh) {
            try {
                await refreshNextUpIndex();
            } catch (error) {
                warn('Failed to refresh Next Up index.', error);
            }
        }

        if (mySeq !== state.runSeq) return;
        processPage();
    }

    function scheduleRun(delay, refresh) {
        const d = typeof delay === 'number' ? delay : 0;

        if (refresh) {
            state.pendingRefresh = true;
        }

        if (state.scheduledRun) {
            clearTimeout(state.scheduledRun);
        }

        state.scheduledRun = setTimeout(function () {
            const doRefresh = state.pendingRefresh;
            state.pendingRefresh = false;
            state.scheduledRun = null;
            run(doRefresh);
        }, d);
    }

    function kickRefresh() {
        scheduleRun(0, true);
        scheduleRun(350, true);
        scheduleRun(900, true);
    }

    function setupObserver() {
        if (state.observer || !document.body) return;

        state.observer = new MutationObserver(function () {
            if (needsReapply()) {
                scheduleRun(CONFIG.reapplyDelayMs, false);
            }
        });

        state.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function setupTimersAndHooks() {
        if (!state.refreshTimer) {
            state.refreshTimer = window.setInterval(function () {
                scheduleRun(0, true);
            }, CONFIG.refreshIntervalMs);
        }

        if (!state.watchDogTimer) {
            state.watchDogTimer = window.setInterval(function () {
                const routeKey = window.location.pathname + window.location.search + window.location.hash;

                if (routeKey !== state.lastRouteKey) {
                    state.lastRouteKey = routeKey;
                    kickRefresh();
                    return;
                }

                if (needsReapply()) {
                    scheduleRun(CONFIG.reapplyDelayMs, false);
                }
            }, CONFIG.watchDogMs);
        }

        window.addEventListener('hashchange', function () { kickRefresh(); }, true);
        window.addEventListener('popstate', function () { kickRefresh(); }, true);
        window.addEventListener('pageshow', function () { kickRefresh(); }, true);
        document.addEventListener('viewshow', function () { kickRefresh(); }, true);
        document.addEventListener('viewbeforeshow', function () { kickRefresh(); }, true);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                kickRefresh();
            }
        }, true);
    }

    function exposeDebugHelpers() {
        window.NextUpHideRestoreAll = function () {
            clearHiddenState();
            window.location.reload();
        };

        window.NextUpHideDump = function () {
            return {
                title: CONFIG.title,
                storageKey: getStorageKey(),
                hiddenSeriesIds: Array.from(state.hiddenSeriesIds),
                hiddenEpisodeIds: Array.from(state.hiddenEpisodeIds),
                nextUpEpisodeIds: Array.from(state.nextUpEpisodeIds)
            };
        };

        window.NextUpHideRefresh = function () {
            kickRefresh();
        };
    }

    async function init() {
        injectStyle();
        loadHiddenState();
        setupObserver();
        setupTimersAndHooks();
        exposeDebugHelpers();
        kickRefresh();
        log('Initialized.');
    }

    function boot() {
        if (state.bootTimer) return;

        state.bootTimer = window.setInterval(function () {
            if (!document.body) return;
            if (!getApiClient()) return;
            if (!getUserId()) return;

            window.clearInterval(state.bootTimer);
            state.bootTimer = null;

            init().catch(function (error) {
                warn('Initialization failed.', error);
            });
        }, 400);
    }

    boot();
})();