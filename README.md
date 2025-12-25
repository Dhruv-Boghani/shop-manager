# 🧾 Advanced Billing & Stock Management System

A full-stack web application built for **Kanishka Fashion** to manage billing, inventory, and multi-shop operations with QR/Barcode-based product tracking and role-based access control.

## 🌐 Live Demo

👉 [Visit the app](https://shop-manager-t98e.onrender.com)

---

## 🚀 Features

- ✅ Unique **QR/Barcode** generation for each product
- 📲 **Scan to bill** functionality (QR/barcode-based)
- 🧾 Auto-generate and download **PDF invoices**
- 🧑‍💼 Role-based access for:
  - **Admin**
  - **Manager**
  - **Seller**
  - **User**
- 🏬 Manage **15+ shop locations** from a single dashboard
- 🔐 **Data security** and restricted visibility by role
- 📦 Real-time **stock tracking**
- 📤 (Optional) **WhatsApp bill delivery** *(currently disabled)*

---

## 🛠️ Tech Stack

**Backend:**
- Node.js
- Express.js
- MongoDB (Mongoose)

**Frontend:**
- EJS (templating engine)
- HTML5 + CSS

**Authentication & Security:**
- JWT (jsonwebtoken)
- bcrypt
- express-validator

**QR & Barcode:**
- `qrcode`
- `bwip-js`
- `qrcode-terminal`

**PDF & File Handling:**
- `pdf-lib`
- `pdfkit`
- `archiver`

**Messaging & Email:**
- WhatsApp integration: `@whiskeysockets/baileys` *(disabled)*
- Email: `nodemailer`

**Other:**
- `node-cron` for task scheduling
- `dotenv` for environment config
- `axios` for HTTP requests

---

## 🧑‍💼 Roles and Permissions

| Role    | Permissions |
|---------|-------------|
| Admin   | Full access: user/shop/product management, analytics, reports |
| Manager | Manage assigned shop(s), products, and billing |
| Seller  | Scan products, create bills, limited stock view |
| User    | View personal billing history and profile |

---

## 🚧 Current Status

- ✅ Stable and deployed
- 🔒 WhatsApp feature disabled at client’s request
- 🛠️ More automation and analytics modules planned for future updates

---

## 📬 Contact

If you're from an **IT company** or a **tech reviewer** and want to test the project, you can request **temporary admin access**:

📧 **dhruvboghani624@gmail.com**

---

## 📄 License

This project was developed for **Kanishka Fashion** and shared publicly **with permission**. It is not licensed for commercial redistribution without approval.
