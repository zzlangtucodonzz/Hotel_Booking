<div align="center">
  <h1>🏨 Wanderly - Hotel Booking Platform</h1>

  ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
  ![ExpressJS](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
  ![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

  <br><br>
  <em>A modern, fully functional hotel booking system designed to connect travelers with hotels, resorts, and homestays. Built with a lightweight Client-Server architecture.</em>
</div>

---

## ✨ Features

### 🧍 For Guests (Users)
- **Advanced Search & Filter:** Find rooms by location, dates, price, and amenities.
- **Seamless Booking:** Interactive booking modal with automatic total calculation.
- **Online Payments:** Integrated with **PayOS** for secure automated bank transfers via QR codes.
- **Wanderly Rewards:** Loyalty points accumulation and tracking.
- **Coupons:** Apply promo codes during checkout.
- **Profile Management:** Manage bookings, personal details, and account settings securely.

### 🛡️ For Admins (Hosts)
- **Analytics Dashboard:** Overview of revenue, bookings, and platform statistics.
- **Property & Room Management:** Add, edit, or remove hotels and room types.
- **Inventory Control:** Real-time room availability management.
- **Booking Management:** Approve, reject, or review customer reservations.

---

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API, DOM manipulation).
- **Backend:** Node.js, Express.js.
- **Database:** MySQL (using `mysql2` driver).
- **Authentication & Security:** JWT (JSON Web Tokens), `bcrypt` for password hashing.
- **Payment Gateway:** PayOS (`@payos/node`).
- **File Uploads:** Multer.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [MySQL](https://www.mysql.com/) Server

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/zzlangtucodonzz/Hotel_Booking.git
cd Hotel_Booking

```

**2. Install dependencies:**

```bash
npm install

```

**3. Database Setup:**

* Open your MySQL client.
* Execute the SQL script located at `database/schema_scripts.sql` (or `database/create_tables_mysql.sql`) to initialize the schema and tables.

**4. Environment Variables:**

* Create a `.env` file in the root directory.
* Add the following configuration (replace with your actual credentials):

```env
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hotel_booking

# JWT Auth
JWT_SECRET=your_jwt_secret_key

# PayOS Integration
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

```

**5. Start the Application:**

```bash
# Start the backend server
npm start

```

**6. Access the App:**

* Open `index.html` in your preferred web browser (or serve the project directory via a local live server like VS Code Live Server).
* API endpoints will be running on `http://localhost:5000`.

---

## 📂 Project Structure

```text
Hotel_Booking/
├── assets/             # Frontend static files (CSS, JS modules, Images)
├── backend/            # Node.js source code
│   ├── controllers/    # Business logic & request handling
│   ├── middlewares/    # Custom middlewares (Auth, File upload)
│   ├── models/         # Database interaction logic
│   ├── routes/         # Express API routing
│   └── config/         # 3rd party configurations (PayOS)
├── database/           # SQL schemas & migration scripts
├── postman/            # Postman collections for API testing
├── uploads/            # Admin uploaded assets (Ignored in Git)
├── server.js           # Backend entry point
└── *.html              # Frontend UI views

```

---

## 📝 API Documentation

API testing and endpoints are documented via Postman. You can import the files located in the `postman/` directory into your Postman workspace to test all available RESTful endpoints.

```

```