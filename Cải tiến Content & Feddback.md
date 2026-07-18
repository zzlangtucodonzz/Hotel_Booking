# 📚 API Improvements Documentation

## 🎯 Tóm tắt các cải thiện

Tôi đã cập nhật 3 chức năng chính: **CMS**, **Reviews**, và **Media Manager**. Dưới đây là danh sách tất cả các endpoints mới và cải tiến.

---

## 1️⃣ CMS (Pages/Blogs) - Cải thiện

### ✅ Các chức năng mới

#### **GET** `/api/admin/posts` - Lấy danh sách posts (với Pagination & Filter)
```
Params:
  - page: số trang (mặc định: 1)
  - limit: số items mỗi trang (mặc định: 10, tối đa: 100)
  - status: lọc theo trạng thái (draft, published, archived)
  - search: tìm kiếm theo title hoặc slug

Response:
{
  "success": true,
  "data": [...posts],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

#### **GET** `/api/admin/posts/stats` - Lấy thống kê posts
```
Response:
{
  "success": true,
  "data": {
    "total": 50,
    "published": 30,
    "draft": 15,
    "archived": 5
  }
}
```

#### **DELETE** `/api/admin/posts/:id` - Xóa một post
```
Response:
{
  "success": true,
  "message": "Post deleted successfully"
}
```

#### **POST** `/api/admin/posts/bulk-delete` - Xóa nhiều posts
```
Body:
{
  "ids": [1, 2, 3, 4, 5]
}

Response:
{
  "success": true,
  "message": "5 post(s) deleted successfully",
  "deletedCount": 5
}
```

---

## 2️⃣ Reviews - Cải thiện

### ✅ Các chức năng mới

#### **GET** `/api/admin/reviews` - Lấy danh sách reviews (với Pagination & Advanced Filter)
```
Params:
  - page: số trang (mặc định: 1)
  - limit: số items mỗi trang (mặc định: 10)
  - status: lọc theo trạng thái (pending, approved, hidden)
  - rating: lọc theo rating (1, 2, 3, 4, 5)
  - search: tìm kiếm theo tên khách, tên hotel, hoặc nội dung review

Response:
{
  "success": true,
  "data": [...reviews],
  "stats": {
    "total_reviews": 100,
    "pending_reviews": 10,
    "approved_reviews": 85,
    "average_rating": 4.5,
    "min_rating": 1,
    "max_rating": 5,
    "ratingDistribution": {
      "5": 50,
      "4": 30,
      "3": 15,
      "2": 3,
      "1": 2
    }
  },
  "pagination": { ... }
}
```

#### **GET** `/api/admin/reviews/stats` - Lấy thống kê reviews
```
Response:
{
  "success": true,
  "data": {
    "total": 100,
    "pending": 10,
    "approved": 85,
    "hidden": 5,
    "average_rating": 4.5
  }
}
```

#### **POST** `/api/admin/reviews/bulk-update-status` - Cập nhật status nhiều reviews
```
Body:
{
  "ids": [1, 2, 3],
  "status": "approved"
}

Response:
{
  "success": true,
  "message": "3 review(s) status updated successfully",
  "updatedCount": 3
}
```

#### **GET** `/api/admin/reviews/export/csv` - Export reviews thành CSV
```
Query Params:
  - status: (optional) lọc theo trạng thái
  - rating: (optional) lọc theo rating

Response: File CSV được download
```

---

## 3️⃣ Media Manager - Cải thiện

### ✅ Các chức năng mới

#### **GET** `/api/admin/media` - Lấy danh sách media (với Pagination & Search)
```
Params:
  - page: số trang (mặc định: 1)
  - limit: số items mỗi trang (mặc định: 20)
  - folder: lọc theo folder
  - search: tìm kiếm theo tên file

Response:
{
  "success": true,
  "data": [...media],
  "pagination": { ... }
}
```

#### **POST** `/api/admin/media/upload` - Upload files (với validation)
```
NEW FEATURES:
  ✅ File size validation: Max 10MB
  ✅ File type validation: 
     - Hình ảnh: JPEG, PNG, WebP, GIF
     - Tài liệu: PDF, DOC
  ✅ Folder organization: Auto-create folders

Form Data:
  - files: multiple files
  - folder: "images/hotels" (optional)

Response:
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": [
    {
      "id": 1,
      "filename": "file-timestamp.jpg",
      "original_name": "hotel.jpg",
      "file_path": "/uploads/media/images/hotels/file-timestamp.jpg",
      "folder": "images/hotels",
      "mime_type": "image/jpeg",
      "size_bytes": 245000
    }
  ]
}
```

#### **POST** `/api/admin/media/folder` - Tạo folder
```
Body:
{
  "folder_name": "new-folder",
  "parent_folder": "images" (optional)
}

Response:
{
  "success": true,
  "message": "Folder created successfully",
  "folder": "images/new-folder"
}
```

#### **GET** `/api/admin/media/folders/list` - Lấy danh sách tất cả folders
```
Response:
{
  "success": true,
  "data": ["root", "images", "images/hotels", "videos", "documents"]
}
```

#### **POST** `/api/admin/media/bulk-delete` - Xóa nhiều files
```
Body:
{
  "ids": [1, 2, 3]
}

Response:
{
  "success": true,
  "message": "3 file(s) deleted successfully",
  "deletedCount": 3
}
```

#### **GET** `/api/admin/media/stats` - Lấy thống kê media
```
Response:
{
  "success": true,
  "data": {
    "total_files": 250,
    "total_size": 5242880000,  // bytes
    "total_folders": 8,
    "file_types": 3,
    "typeDistribution": [
      { "mime_type": "image/jpeg", "count": 150 },
      { "mime_type": "image/png", "count": 80 },
      { "mime_type": "application/pdf", "count": 20 }
    ]
  }
}
```

---

## 📊 Bảng so sánh chức năng

| Chức năng | Trước | Sau |
|-----------|-------|-----|
| **CMS** |
| Pagination | ❌ | ✅ |
| Search/Filter | ❌ | ✅ |
| Delete post | ❌ | ✅ |
| Bulk delete | ❌ | ✅ |
| Stats | ❌ | ✅ |
| **Reviews** |
| Pagination | ❌ | ✅ |
| Filter by rating | ❌ | ✅ |
| Bulk update | ❌ | ✅ |
| CSV export | ❌ | ✅ |
| Stats | ❌ | ✅ |
| Rating distribution | ❌ | ✅ |
| **Media** |
| File validation | ❌ | ✅ |
| Folder management | ❌ | ✅ |
| File size limit | ❌ | ✅ |
| Pagination | ❌ | ✅ |
| Bulk delete | ❌ | ✅ |
| Stats | ❌ | ✅ |
| Search | ❌ | ✅ |

---

## 🔒 File Validation Rules (Media Manager)

### Allowed MIME Types:
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/webp` (.webp)
- `image/gif` (.gif)
- `application/pdf` (.pdf)
- `application/msword` (.doc, .docx)

### File Size Limit:
- **Maximum: 10MB**

### Error Messages:
```
"File type not allowed. Allowed types: image/jpeg, image/png, ..."
"File too large. Maximum size: 10MB"
```

---

## 🚀 Cách sử dụng

### Ví dụ 1: Tìm kiếm posts công bố
```bash
GET /api/admin/posts?status=published&search=hotel&page=1&limit=10
```

### Ví dụ 2: Lấy reviews xếp hạng 5 sao
```bash
GET /api/admin/reviews?rating=5&page=1&limit=20
```

### Ví dụ 3: Upload ảnh vào folder
```bash
POST /api/admin/media/upload
FormData:
  - files: [image1.jpg, image2.png]
  - folder: "images/hotels"
```

### Ví dụ 4: Xóa nhiều posts
```bash
POST /api/admin/posts/bulk-delete
Body: { "ids": [1, 2, 3, 4, 5] }
```

### Ví dụ 5: Export reviews
```bash
GET /api/admin/reviews/export/csv?status=approved&rating=4
# Tải file reviews.csv
```

---

## ⚙️ Cấu hình Environment (nếu cần)

Các biến environment hiện tại đã đủ. Nếu muốn điều chỉnh:

```env
# Có thể thêm vào .env nếu cần
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=jpeg,png,webp,gif,pdf,doc
```

---

## 🔧 Troubleshooting

### 1. Upload file bị lỗi "File type not allowed"
- Kiểm tra file format được hỗ trợ
- Chỉ chấp nhận: JPEG, PNG, WebP, GIF, PDF, DOC

### 2. File quá lớn
- Giới hạn: 10MB
- Nén ảnh hoặc chia file nhỏ hơn

### 3. Folder không được tạo
- Tên folder chỉ hỗ trợ: a-z, A-Z, 0-9, -, _
- Tránh ký tự đặc biệt

### 4. Bulk delete không hoạt động
- Kiểm tra IDs có tồn tại không
- Mảng IDs phải không rỗng

---

## 📝 Notes

- Tất cả endpoints yêu cầu **auth token** và quyền **admin**
- Pagination giúp load dữ liệu nhanh hơn
- File validation giúp bảo vệ hệ thống
- CSV export hỗ trợ báo cáo và phân tích dữ liệu

