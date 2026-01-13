# TicketUno

Full-stack theater seat reservation system with multi-language support.

## Features

- Multi-language support (English, Italian, French)
- Public theater listing and seat selection
- Secure admin API for theater management
- SQLite database storage
- RESTful API
- Material-UI components
- TypeScript throughout

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## API Endpoints

### Public
- `GET /api/theaters` - List all theaters with stats
- `GET /api/theaters/:id` - Get theater details
- `POST /api/theaters/:id/book` - Book seats

### Protected (require auth token)
- `POST /api/theaters` - Create new theater
- `PUT /api/theaters/:id/reservations` - Update reservations
- `POST /api/theaters/auth/login` - Admin login

## Environment Variables

### Backend (.env)
```
PORT=3001
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=your-admin-password
DB_PATH=./data/theaters.db
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001/api
```

## Default Credentials

Admin password: Set in backend .env file

## License

MIT
