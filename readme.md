HRMS Assessment Setup Guide

This project is divided into two parts:

Frontend – built using React + Vite (hrms-react)
Backend – powered by Django (hrms-backend)


step by step 👇

Frontend Setup (React + Vite)

Start by setting up the frontend:

cd hrms-react
npm install
npm run dev

Once it runs, you’ll see a local URL like:
http://localhost:5173

That’s your frontend running


Backend Setup (Django)

Now let’s get the backend running.

1️⃣ Go to backend folder & create virtual environment
cd hrms-backend
python -m venv venv
2️Activate virtual environment

For macOS / Linux:

source venv/bin/activate

For Windows:

venv\Scripts\activate
Install dependencies & setup database

pip install -r requirements.txt
python manage.py migrate
Final Step: Connect Frontend & Backend

Make sure Django backend is running (usually on http://127.0.0.1:8000)
Ensure frontend API URLs match the backend URL
You’re Ready!

Frontend → http://localhost:5173
Backend → http://127.0.0.1:8000

change the baseurl in environment.js under backend folder in hrms-react

Now you can start exploring or building features 🚀