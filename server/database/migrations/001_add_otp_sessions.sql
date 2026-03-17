/**
 * Add this migration to your database setup
 * 
 * Creates otp_sessions table for storing temporary OTP verification data
 * This supports phone-based authentication
 */

CREATE TABLE IF NOT EXISTS otp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_otp_user_id (user_id),
    INDEX idx_otp_expires (expires_at)
);

-- Automatically delete expired OTPs daily
-- TODO: Set up a scheduled job or call periodically
-- DELETE FROM otp_sessions WHERE expires_at < NOW();
