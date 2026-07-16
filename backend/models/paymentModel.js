import pool from '../connection.js';

/**
 * Insert a new PENDING payment
 * @param {Object} paymentData 
 * @returns {Promise<Object>} Insert Result
 */
export const createPayment = async (paymentData) => {
    const { booking_id, transaction_code, amount, gateway = 'payOS', payos_order_code } = paymentData;
    const query = `
        INSERT INTO payments (booking_id, transaction_code, amount, gateway, status, payos_order_code)
        VALUES (?, ?, ?, ?, 'PENDING', ?)
    `;
    
    try {
        const [result] = await pool.execute(query, [
            booking_id, 
            transaction_code, 
            amount, 
            gateway, 
            payos_order_code
        ]);
        return result;
    } catch (error) {
        console.error('❌ Error in createPayment:', error.message);
        throw error;
    }
};

/**
 * Update the status of a payment
 * @param {Number} payosOrderCode 
 * @param {String} status 
 * @returns {Promise<Object>} Update Result
 */
export const updatePaymentStatus = async (payosOrderCode, status) => {
    const query = `
        UPDATE payments 
        SET status = ? 
        WHERE payos_order_code = ?
    `;
    
    try {
        const [result] = await pool.execute(query, [status, payosOrderCode]);
        return result;
    } catch (error) {
        console.error('❌ Error in updatePaymentStatus:', error.message);
        throw error;
    }
};

/**
 * Fetch a payment record by its order code
 * @param {Number} payosOrderCode 
 * @returns {Promise<Object|undefined>} Payment Record
 */
export const getPaymentByOrderCode = async (payosOrderCode) => {
    const query = `
        SELECT * FROM payments 
        WHERE payos_order_code = ?
    `;
    
    try {
        const [rows] = await pool.execute(query, [payosOrderCode]);
        return rows[0];
    } catch (error) {
        console.error('❌ Error in getPaymentByOrderCode:', error.message);
        throw error;
    }
};

/**
 * Insert a refund record
 * @param {Object} refundData 
 * @returns {Promise<Object>} Insert Result
 */
export const createRefund = async (refundData) => {
    const { payment_id, amount, reason } = refundData;
    const query = `
        INSERT INTO refunds (payment_id, amount, reason, status)
        VALUES (?, ?, ?, 'PENDING')
    `;
    
    try {
        const [result] = await pool.execute(query, [payment_id, amount, reason]);
        return result;
    } catch (error) {
        console.error('❌ Error in createRefund:', error.message);
        throw error;
    }
};
