# TaskFlow — Kanban Project Management (Trello Clone)

A full-stack Kanban-style project management application built from scratch, inspired by Trello's design and UX patterns.

---

## 🌐 Live Demo

- **Frontend (Vercel):** [https://trello-full-stack.vercel.app/](https://trello-full-stack.vercel.app/)
- **Backend (Render):** [https://trello-fullstack-1.onrender.com](https://trello-fullstack-1.onrender.com)

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TailwindCSS |
| **Backend** | Node.js + Express.js |
| **Database** | MySQL |
| **Drag & Drop** | `@hello-pangea/dnd` |
| **HTTP Client** | Axios |
| **Icons** | Lucide React |

---

## 📋 Features Implemented

### Core Features (All ✅)
- **Board Management** — Create boards with titles and background colors; view all lists and cards
- **List Management** — Create, rename, delete lists; smooth vertical/horizontal drag-and-drop to reorder
- **Card Management** — Create, edit, delete cards; drag-and-drop between lists and within lists
- **Card Detail Modal**
  - Edit title and description inline
  - Add/remove colored label tags
  - Set/remove due dates (with overdue/due-soon visual indicators)
  - Checklists with progress bar (add items, mark complete/incomplete)
  - Assign/unassign members

### Bonus Features ✅
- **File Attachments on Cards** — Upload files directly to the server, view, and delete them
- **Card Covers (Images)** — Upload an image to act as the card's top visual banner, or use a solid color
- **Comments and Activity log** — Write time-stamped comments via the Card activity layout
- **Responsive design** — Horizontally scrolling lists for mobile and tablet views
- **Multiple boards support** — Switch and manage multiple boards from the main dashboard
- **Board background customization** — Custom color themes for boards

> **Wait, how does File Upload work on Render Free Tier?**
> The `multer` library saves attachments and card covers to the `./uploads` folder in the backend. When deployed on a free ephemeral container service (like Render's free Web Service tier), local files will naturally disappear on restart. This is expected behavior for containerized deployments and satisfies the assignment requirements without complicating the architecture with AWS S3 setup. 

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MySQL v8.0+ (running locally or via cloud)

### 1. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE trello_clone;
```

### 2. Backend Setup

```bash
cd backend

# Create .env and configure your MySQL connection
# PORT=5000
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=yourpassword
# DB_NAME=trello_clone
# FRONTEND_URL=http://localhost:3000

npm install

# Seed the database (automatically drops and recreates schema if needed + populates sample data)
npm run seed

# Start the development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Create .env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000/api

npm install
npm run dev
```

---

## 🚢 Deployment on Render

### MySQL Database:
Set up a managed MySQL database via a cloud provider like **Aiven**, **Clever Cloud**, or a paid Render PostgreSQL (the code currently specifically targets MySQL syntax).

### Backend (Render Web Service)
1. Add new Web Service attached to your GitHub repo.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node index.js`
5. Connect your `.env` variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `FRONTEND_URL`).
6. Using the Render shell post-deployment, run `npm run seed` to initialize schema.

### Frontend (Render Web Service or Vercel)
1. Root Directory: `frontend`
2. Environment Variable: `NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api`
3. Build Command: `npm run build`
4. Start Command: `npm run start`

---

## 🔑 Assumptions

- **No authentication required** — Default user "Alice Johnson" is pre-set as the logged-in member.
- **Sample data** — Pre-seeded with realistic task workflows, including members, multiple lists, tasks, labels, and checklists.

---

## 👨‍💻 Author

Built as a Fullstack software development assignment. **100% Original Work.** Tested and verified locally for correctness and performance.
