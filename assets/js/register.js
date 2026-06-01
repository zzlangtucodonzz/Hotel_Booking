// ============================================================
// Register Page — Frontend Logic (Vanilla JS)
// Xử lý sự kiện đăng ký tài khoản mới
// ============================================================

// --- Cấu hình ---
const API_REGISTER_URL = '/api/auth/register';
const REDIRECT_DELAY_MS = 5000;
const MIN_PASSWORD_LENGTH = 6;
const BUTTON_DEFAULT_TEXT = 'SIGN UP';
const BUTTON_LOADING_TEXT = 'PROCESSING...';

// --- Lấy các phần tử DOM cần thiết ---
const fullNameInput        = document.getElementById('fullName');
const emailInput           = document.getElementById('email');
const phoneNumberInput     = document.getElementById('phoneNumber');
const passwordInput        = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const btnSignUp            = document.getElementById('btnSignUp');
const messageBox           = document.getElementById('messageBox');

/**
 * Hàm tiện ích: Hiển thị thông báo trong messageBox
 * Thay đổi nội dung và màu sắc dựa trên loại thông báo
 * @param {string} text - Nội dung thông báo
 * @param {'success' | 'error'} type - Loại thông báo (xanh lá hoặc đỏ)
 */
const showMessage = (text, type) => {
    messageBox.textContent = text;

    // Reset về class mặc định trước khi thêm class mới
    messageBox.className = 'auth-message-box';

    if (type === 'success') {
        messageBox.classList.add('auth-message-success');
    } else {
        messageBox.classList.add('auth-message-error');
    }

    // Hiện messageBox (mặc định bị ẩn bằng inline style)
    messageBox.style.display = 'block';
};

/**
 * Hàm tiện ích: Ẩn thông báo và xóa nội dung cũ
 */
const hideMessage = () => {
    messageBox.style.display = 'none';
    messageBox.textContent = '';
};

/**
 * Kiểm tra dữ liệu đầu vào phía Frontend trước khi gửi lên Server
 * @returns {{ isValid: boolean, errorMessage: string }}
 */
const validateInputs = (fullName, email, password, confirmPassword) => {
    // Kiểm tra tất cả 4 trường không được để trống
    if (!fullName || !email || !password || !confirmPassword) {
        return { isValid: false, errorMessage: 'All fields are required. Please fill in every field.' };
    }

    // Kiểm tra mật khẩu phải có ít nhất 6 ký tự
    if (password.length < MIN_PASSWORD_LENGTH) {
        return { isValid: false, errorMessage: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` };
    }

    // Kiểm tra mật khẩu và xác nhận mật khẩu phải khớp nhau
    if (password !== confirmPassword) {
        return { isValid: false, errorMessage: 'Passwords do not match. Please re-enter.' };
    }

    return { isValid: true, errorMessage: '' };
};

/**
 * Chuyển đổi trạng thái nút submit: loading hoặc mặc định
 * @param {boolean} isLoading - true = đang xử lý, false = trạng thái bình thường
 */
const setButtonLoading = (isLoading) => {
    btnSignUp.disabled = isLoading;
    btnSignUp.textContent = isLoading ? BUTTON_LOADING_TEXT : BUTTON_DEFAULT_TEXT;
};

/**
 * Vô hiệu hóa tất cả input fields (gọi sau khi đăng ký thành công)
 */
const disableAllInputs = () => {
    [fullNameInput, emailInput, phoneNumberInput, passwordInput, confirmPasswordInput].forEach(
        (input) => { input.disabled = true; }
    );
};

/**
 * Xử lý chính: Gửi request đăng ký tài khoản mới đến Backend API
 * Sử dụng async/await kết hợp try/catch để xử lý bất đồng bộ
 */
const handleRegister = async (event) => {
    // Ngăn chặn hành vi mặc định của form (reload trang)
    event.preventDefault();

    // Ẩn thông báo cũ (nếu có) trước khi bắt đầu xử lý mới
    hideMessage();

    // Lấy giá trị từ các input và loại bỏ khoảng trắng thừa
    const fullName       = fullNameInput.value.trim();
    const email          = emailInput.value.trim();
    const phoneNumber    = phoneNumberInput.value.trim();   // optional — may be empty
    const password       = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // --- Validation phía Frontend ---
    const { isValid, errorMessage } = validateInputs(fullName, email, password, confirmPassword);

    if (!isValid) {
        // Hiển thị lỗi validation và dừng lại, không gửi request
        showMessage(errorMessage, 'error');
        return;
    }

    // --- Chuyển nút sang trạng thái "PROCESSING..." và vô hiệu hóa ---
    setButtonLoading(true);

    try {
        // --- Gọi API đăng ký bằng Fetch API ---
        const response = await fetch(API_REGISTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                FullName:    fullName,
                Email:       email,
                Password:    password,
                PhoneNumber: phoneNumber || null,   // optional — null if left blank
            }),
        });

        // Phân tích dữ liệu JSON từ response của server
        const data = await response.json();

        if (response.ok && data.success) {
            // --- THÀNH CÔNG: Hiển thị thông báo xanh lá ---
            showMessage('Registration successful! Redirecting...', 'success');

            // Vô hiệu hóa toàn bộ input để người dùng không chỉnh sửa nữa
            disableAllInputs();

            // Chờ đúng 5 giây rồi chuyển hướng sang trang đăng nhập
            setTimeout(() => {
                window.location.href = 'login.html';
            }, REDIRECT_DELAY_MS);
        } else {
            // --- THẤT BẠI: Hiển thị lỗi từ Backend (ví dụ: email đã tồn tại) ---
            const backendErrorMessage = data.message || 'Registration failed. Please try again.';
            showMessage(backendErrorMessage, 'error');

            // Khôi phục nút về trạng thái ban đầu để người dùng thử lại
            setButtonLoading(false);
        }
    } catch (networkError) {
        // --- Lỗi mạng hoặc server không phản hồi ---
        console.error('Registration network error:', networkError);
        showMessage('Unable to connect to the server. Please check your connection and try again.', 'error');

        // Khôi phục nút về trạng thái ban đầu
        setButtonLoading(false);
    }
};

// --- Gắn sự kiện submit cho form đăng ký ---
btnSignUp.closest('form').addEventListener('submit', handleRegister);
