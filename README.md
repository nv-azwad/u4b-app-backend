# Upcycle4Better Backend API

This repository contains the backend API for the Upcycle4Better mobile and web application. It is built using **Node.js**, **Express**, and **PostgreSQL**, and provides all server-side logic for user authentication, donation submissions, admin verification, voucher management, and more.

---

## 🚀 Technology Stack

- **Node.js**
- **Express.js**
- **PostgreSQL** + `pg` library
- **JWT Authentication**
- **Multer** (for image/video uploads)
- **dotenv** (for environment variables)
- **CORS**

---

## 📁 Project Structure

backend/
│── config/
│ └── database.js
│
│── controllers/
│ ├── authController.js
│ ├── donationController.js
│ └── voucherController.js
│
│── middleware/
│ ├── authMiddleware.js
│ └── upload.js
│
│── routes/
│ ├── authRoutes.js
│ ├── donationRoutes.js
│ └── voucherRoutes.js
│
│── uploads/
│ └── (uploaded videos/photos for verification)
│
│── .env
│── .gitignore
│── package.json
│── server.js


---

## 🔧 Environment Variables

Create a `.env` file in the project root:
PORT=5000

DB_USER=your_database_user
DB_HOST=localhost
DB_NAME=u4b_db
DB_PASSWORD=your_password
DB_PORT=5432

JWT_SECRET=your_super_secret_key

NODE_ENV=development


---

## 🗄️ Database Setup

1. Install PostgreSQL
2. Create the database:


CREATE DATABASE u4b_db;

3. Make sure your `.env` matches your local database credentials.

---

## ▶️ Running the Server

Install dependencies:



npm install


Start server:



npm run dev


Server runs on:



http://localhost:5000


---

## 🔐 Authentication (JWT)

- Login returns a JWT token
- Protected routes require `Authorization: Bearer <token>`

---

## 📦 API Features

### **1. User Authentication**
- Register
- Login
- Token verification

### **2. Donation Submissions**
- User uploads video/photo proof
- Stores media inside `/uploads`
- Saves submission to PostgreSQL

### **3. Admin Verification**
- Admin dashboard pulls all unverified submissions
- Admin approves/rejects submissions

### **4. Voucher Management**
- Auto-generate vouchers when a donation is approved
- Users can redeem vouchers via app

---

## 🧪 Testing the API

You can test the APIs using:
- Postman
- Thunder Client (VS Code)

---

## 📝 License

This project is licensed under **MIT License**.

---

## 👤 Maintainer

Upcycle4Better — Port Klang, Malaysia  
Backend built by Upcycle (Darryl)

