
theatre
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   └── theaters.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── models/
│   │   │   └── Theater.ts
│   │   └── db/
│   │       └── database.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   └── locales/
│   │   │       ├── en.json
│   │   │       ├── it.json
│   │   │       └── fr.json
│   │   ├── components/
│   │   │   ├── TheaterList.tsx
│   │   │   ├── TheaterSeating.tsx
│   │   │   └── LanguageSelector.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── theater.ts
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
