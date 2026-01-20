import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Helper to get token param
const getTokenParam = () => {
    const token = localStorage.getItem('outlook_token');
    return token ? `token=${token}` : '';
};

// Mail API
export const mailApi = {
    getFolders: async () => {
        const response = await api.get(`/mail/folders?${getTokenParam()}`);
        return response.data;
    },

    getChildFolders: async (folderId) => {
        const response = await api.get(`/mail/folders/${folderId}/children?${getTokenParam()}`);
        return response.data;
    },

    getMessages: async (folderId = 'inbox', top = 100, skip = 0) => {
        const response = await api.get(`/mail/messages?${getTokenParam()}&folder_id=${folderId}&top=${top}&skip=${skip}`);
        return response.data;
    },

    getMessageDetail: async (messageId) => {
        const response = await api.get(`/mail/messages/${messageId}?${getTokenParam()}`);
        return response.data;
    },

    moveMessage: async (messageId, destinationFolderId) => {
        const response = await api.post(`/mail/messages/${messageId}/move?${getTokenParam()}&destination_folder_id=${destinationFolderId}`);
        return response.data;
    }
};

// Rules API
export const rulesApi = {
    getRules: async () => {
        const response = await api.get(`/rules/?${getTokenParam()}`);
        return response.data;
    },

    createRule: async (rule) => {
        const response = await api.post(`/rules/?${getTokenParam()}`, rule);
        return response.data;
    },

    updateRule: async (ruleId, rule) => {
        const response = await api.put(`/rules/${ruleId}?${getTokenParam()}`, rule);
        return response.data;
    },

    deleteRule: async (ruleId) => {
        const response = await api.delete(`/rules/${ruleId}?${getTokenParam()}`);
        return response.data;
    },

    toggleRule: async (ruleId) => {
        const response = await api.patch(`/rules/${ruleId}/toggle?${getTokenParam()}`);
        return response.data;
    }
};

// Classification API
export const classifyApi = {
    analyzeEmails: async (messageIds, ruleIds = null, dryRun = true) => {
        const response = await api.post(`/classify/analyze?${getTokenParam()}`, {
            message_ids: messageIds,
            rule_ids: ruleIds,
            dry_run: dryRun
        });
        return response.data;
    },

    executeClassification: async (messageIds, ruleIds = null, dryRun = false) => {
        const response = await api.post(`/classify/execute?${getTokenParam()}`, {
            message_ids: messageIds,
            rule_ids: ruleIds,
            dry_run: dryRun
        });
        return response.data;
    },

    getHistory: async (limit = 50) => {
        const response = await api.get(`/classify/history?${getTokenParam()}&limit=${limit}`);
        return response.data;
    },

    getStats: async () => {
        const response = await api.get(`/classify/stats?${getTokenParam()}`);
        return response.data;
    }
};

export default api;
