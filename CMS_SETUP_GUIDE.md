# 🎉 CMS Promotions & Posts Feature - Setup Guide

## Overview
Your Hotel Booking system now has a fully functional **CMS (Content Management System)** that allows you to:
- ✍️ Create promotional posts and announcements
- 🎟️ Add voucher codes and promotional descriptions
- 📱 Display posts on the homepage index page
- 🔧 Manage post status (Draft, Published, Archived)

## Quick Start

### Step 1: Initialize the Database Table

Run the following SQL script to create the posts table:

```sql
-- Execute this in your MySQL client (phpMyAdmin or MySQL Workbench)
source database/setup-posts.sql;
```

Or manually run this query:

```sql
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content LONGTEXT NULL,
    voucher_code VARCHAR(100) NULL,
    voucher_description VARCHAR(500) NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    featured_image VARCHAR(255) NULL,
    author_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at DATETIME NULL,
    view_count INT DEFAULT 0,
    FULLTEXT INDEX ft_title_content (title, content),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Step 2: Access the CMS in Admin Panel

1. Navigate to **Admin Console** (http://localhost:5000/admin.html)
2. Log in with your admin account
3. Click on **CMS (Pages/Blogs)** in the left sidebar

## How to Create a Promotional Post

### Example: Create a "Summer Discount" Post

1. **Click "Create New Post"** button
   
2. **Fill in Post Details:**
   - **Title**: "🌞 Book Now - Summer Discount on All Rooms!"
   - **Slug**: `summer-discount-booking` (auto-generated from title, but you can edit)
   
3. **Write Content** using the Rich Text Editor:
   ```
   This summer, enjoy 20% off on all room bookings!
   
   ✨ What's Included:
   • 20% discount on room rates
   • Free breakfast upgrade
   • Complimentary airport transfer (5+ nights)
   
   Valid until: August 31, 2024
   Book now and save big!
   ```

4. **Add Voucher Information** (in the right sidebar):
   - **Voucher Code**: `SUMMER20`
   - **Voucher Description**: `Get 20% off on room bookings! Plus free breakfast upgrade and complimentary airport transfer on 5+ night stays.`

5. **Set Status**: Click the **Status** dropdown and select **"Published"**

6. **Click "Save Post"**

## Post Statuses Explained

| Status | Visibility | Use Case |
|--------|-----------|----------|
| **Draft** | Hidden from homepage | Work in progress |
| **Published** | Visible on homepage | Active promotions |
| **Archived** | Hidden from homepage | Past promotions |

## How Posts Display on Homepage

Once published, your posts appear in the **"Latest Promotions & News"** section on the homepage index.html:

- **Section Location**: Below the "Loyalty Rewards" section
- **Display Format**: Grid of cards (3 cards per row on desktop)
- **Each Card Shows**:
  - Post title
  - Content preview (first 150 characters)
  - Publication date
  - **Voucher code in highlighted box** (if provided)
  - Voucher description

### Example Card Display:

```
╔════════════════════════════════════════╗
║ 🏨 Summer Discount - Book Your Room!   ║
║                                        ║
║ This summer, enjoy 20% off on all room║
║ bookings across our curated collection║
║ of hotels and resorts...               ║
║                                        ║
║ 19 Jul 2024                            ║
║                                        ║
║ Use code:                              ║
║ ┌──────────────────────────────────┐  ║
║ │        SUMMER20                  │  ║
║ └──────────────────────────────────┘  ║
║ Get 20% off! Free breakfast upgrade   ║
╚════════════════════════════════════════╝
```

## API Endpoints

### For Admin (Authenticated):
- **GET** `/api/admin/posts` - List all posts with pagination
- **POST** `/api/admin/posts` - Create new post
- **GET** `/api/admin/posts/:id` - Get post details
- **PUT** `/api/admin/posts/:id` - Update post
- **DELETE** `/api/admin/posts/:id` - Delete post
- **PATCH** `/api/admin/posts/:id/status` - Change post status

### For Public (No Auth Required):
- **GET** `/api/public/posts?limit=6&offset=0` - Get published posts

## Content Tips

### For Best Results:

1. **Post Titles**: Keep concise and engaging
   - ✅ "Book Now - Summer Sale 20% Off All Rooms!"
   - ❌ "This is an announcement about a discount"

2. **Content**: Use the rich text editor
   - Add **bold** and *italic* text
   - Create lists and bullet points
   - Include emojis for visual appeal

3. **Voucher Codes**: 
   - Make them memorable and easy to type
   - Examples: `SUMMER20`, `DISCOUNT2024`, `LOYALTY15`
   - Avoid special characters

4. **Descriptions**: 
   - Be clear about what the offer includes
   - Mention expiration date if applicable
   - Include any terms or conditions

## Troubleshooting

### Posts Don't Appear on Homepage
- ✅ Check Status is set to **"Published"**
- ✅ Check post slug is unique (no duplicates)
- ✅ Check database table was created (run setup-posts.sql)
- ✅ Check browser cache (Ctrl+F5 to hard refresh)

### Admin Form Shows Errors
- ✅ Title and Slug are required fields
- ✅ Slug must contain only letters, numbers, hyphens
- ✅ Each slug must be unique

### Voucher Code Not Showing
- ✅ Voucher Code field is optional
- ✅ Leave blank if not needed for this post

## Advanced: Customizing Post Display

The posts are loaded in `assets/js/main.js` via the `loadPromotionsPosts()` function.

To customize styling, edit the inline CSS in that function or modify `assets/css/style.css` to add:

```css
.promotion-card {
  /* Your custom styles */
}
```

## API Response Example

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Summer Discount - Book Your Getaway Today!",
      "slug": "summer-discount-2024",
      "content": "<p><strong>🌞 Beat the Heat...</strong></p>",
      "voucher_code": "SUMMER20",
      "voucher_description": "Get 20% off on room bookings!",
      "created_at": "2024-07-19T10:30:00.000Z",
      "updated_at": "2024-07-19T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 6,
    "offset": 0,
    "hasMore": false
  }
}
```

## File Changes Summary

### New Files Created:
- `database/setup-posts.sql` - Posts table initialization script
- `database/posts_schema.sql` - Posts table schema definition

### Modified Files:
- `backend/controllers/cmsController.js` - Added voucher fields, new getPublicPosts() function
- `backend/server.js` - Added public posts route
- `admin.html` - Added voucher code/description form fields
- `assets/js/admin.js` - Updated to handle voucher fields
- `assets/js/main.js` - Added loadPromotionsPosts() function
- `index.html` - Added promotions section

---

**Need Help?** Check the admin console CMS section or review the API endpoints documentation.
