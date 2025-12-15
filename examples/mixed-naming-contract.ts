export interface BackendResponse {
    user_id: string;
    created_at: string;
    is_active: boolean;
}

export type User_Meta = {
    login_count: number;
    last_ip: string;
}

function processUser() {
    // This file tests that backend contracts (interfaces/types)
    // are allowed to use snake_case properties without triggering
    // the mixed-naming rule, while other code would be flagged.
    const validCamelCase = "ok";
}
