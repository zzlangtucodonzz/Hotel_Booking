document.addEventListener('DOMContentLoaded', () => {
  // 1. Lấy dữ liệu từ localStorage
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');

  // 2. Bảo vệ trang (Route Guard): Nếu chưa đăng nhập thì đá văng về trang Login
  if (!token || !userRaw) {
    window.location.href = 'login.html';
    return;
  }

  // 3. Phân tích dữ liệu JSON
  let user;
  try {
    user = JSON.parse(userRaw);
  } catch (error) {
    // Nếu dữ liệu bị lỗi, xóa sạch và bắt đăng nhập lại
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    return;
  }

  // 4. Hiển thị thông tin lên giao diện
  const nameEl = document.getElementById('display-fullname');
  const emailEl = document.getElementById('display-email');
  const roleEl = document.getElementById('display-role');

  if (nameEl) nameEl.textContent = user.fullName || 'N/A';
  if (emailEl) emailEl.textContent = user.email || 'N/A';
  if (roleEl) roleEl.textContent = user.roleName || 'Customer';

  // 5. Xử lý nút Đăng xuất
  const btnLogout = document.getElementById('btn-profile-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
  }
});