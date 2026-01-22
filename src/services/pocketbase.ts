type PocketBaseAuth = {
    token?: string;
    model?: { id?: string };
};

const AUTH_STORAGE_KEY = 'pb_auth';

const resolvePocketBaseUrl = () => {
    if (import.meta.env.VITE_POCKETBASE_URL) {
        return import.meta.env.VITE_POCKETBASE_URL;
    }
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return '';
};

const loadAuth = (): PocketBaseAuth | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw) as PocketBaseAuth;
    } catch {
        return null;
    }
};

const buildHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    const auth = loadAuth();
    if (auth?.token) {
        headers.Authorization = auth.token;
    }
    return headers;
};

const request = async (url: string, options: RequestInit) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PocketBase request failed (${response.status}): ${errorText}`);
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
};

const createCollectionClient = (baseUrl: string, collection: string) => {
    const baseEndpoint = `${baseUrl}/api/collections/${collection}/records`;
    return {
        async getFullList(options?: { sort?: string }) {
            const url = new URL(baseEndpoint);
            url.searchParams.set('perPage', '200');
            if (options?.sort) {
                url.searchParams.set('sort', options.sort);
            }
            const data = await request(url.toString(), { method: 'GET', headers: buildHeaders() });
            return data?.items ?? [];
        },
        async create(payload: Record<string, unknown> | FormData) {
            const isFormData = payload instanceof FormData;
            const headers = buildHeaders();
            if (isFormData) {
                delete headers['Content-Type']; // Let browser set boundary
            }
            return request(baseEndpoint, {
                method: 'POST',
                headers,
                body: isFormData ? payload : JSON.stringify(payload)
            });
        },
        async update(id: string, payload: Record<string, unknown> | FormData) {
            const isFormData = payload instanceof FormData;
            const headers = buildHeaders();
            if (isFormData) {
                delete headers['Content-Type']; // Let browser set boundary
            }
            return request(`${baseEndpoint}/${id}`, {
                method: 'PATCH',
                headers,
                body: isFormData ? payload : JSON.stringify(payload)
            });
        },
        async delete(id: string) {
            return request(`${baseEndpoint}/${id}`, {
                method: 'DELETE',
                headers: buildHeaders()
            });
        }
    };
};

const pb = {
    baseUrl: resolvePocketBaseUrl(),
    authStore: {
        get token() {
            return loadAuth()?.token ?? null;
        },
        get model() {
            return loadAuth()?.model ?? null;
        }
    },
    collection(name: string) {
        if (!this.baseUrl) {
            throw new Error('PocketBase URL is not configured.');
        }
        return createCollectionClient(this.baseUrl, name);
    }
};

export default pb;
