/*
Service requirement details 

1. Generate random 6 digit OTP (single use)
2. Send OTP to user email via SMS
3. If a user requests for new otp previous otp becomes invalid
4. Validate OTP
5. If OTP is requested more than three times in 10 minutes throttle request. 'Try again after some time'
6. OTP validation, 3 incorrect OTP per session throttle attempts
7. OTP expiry

*/

import hmac from 'crypto'

function verifyOTP(id, challengeId, otp) {
    return 0;
}

function sendOTPRequest(email, challengeId) {
    return 0;
}
