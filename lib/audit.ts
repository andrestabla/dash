import pool from './db';

/**
 * Centrally log an action to the audit_logs table.
 * @param userId - The user the action is related to
 * @param action - The name of the action (e.g., 'ACCEPT_POLICY')
 * @param details - Additional details about the action
 * @param performedBy - The ID of the user who performed the action (usually the same as userId, or an admin)
 * @param client - Optional PG client if already in a transaction
 */
export async function logAction(
    userId: string,
    action: string,
    details: string,
    performedBy: string,
    client: any = null
) {
    const query = 'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)';
    const values = [userId, action, JSON.stringify({ note: details, performed_by: performedBy })];

    try {
        if (client) {
            await client.query(query, values);
        } else {
            const internalClient = await pool.connect();
            try {
                await internalClient.query(query, values);
            } finally {
                internalClient.release();
            }
        }
    } catch (e) {
        console.error("Failed to write audit log:", e);
    }
}
