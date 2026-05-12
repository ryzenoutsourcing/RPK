markdown
# 🚖 Ryzen Ecosystem – Multi-Platform Bedrijfssoftware

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-production-green)
![Supabase](https://img.shields.io/badge/supabase-integrated-orange)
![License](https://img.shields.io/badge/license-MIT-green)

**Drie complete bedrijfsplatforms – één codebase.**  
Ryzen is een modulair ecosysteem voor taxi bedrijven, vakantieverhuur en autodealers. Alles draait op Supabase met realtime functionaliteit.

---

## 📋 Inhoudsopgave

- [Overzicht](#overzicht)
- [Modules](#modules)
- [Features](#features)
- [Installatie](#installatie)
- [Configuratie](#configuratie)
- [Database Schema](#database-schema)
- [Bestandsstructuur](#bestandsstructuur)
- [Bekende beperkingen](#bekende-beperkingen)
- [Licentie](#licentie)

---

## 🎯 Overzicht

Ryzen is ontstaan uit de behoefte aan **geïntegreerde bedrijfssoftware** voor drie sectoren. In plaats van drie aparte systemen, is er één ecosysteem gebouwd met gedeelde database.

| Probleem | Oplossing |
|----------|-----------|
| Dure losse abonnementen | Alles-in-één platform |
| Geen realtime updates | Supabase Realtime |
| Tijdrovende admin | Geautomatiseerde workflows |
| Beperkte schaalbaarheid | Supabase backend |

---

## 📦 Modules

### 1. Fleetconnect Taxi 🚖
**Voor:** Taxibedrijven met 5-50 wagens

- ✅ Boekingswebsite (5 stappen met routeberekening)
- ✅ Klantportaal met ritgeschiedenis en PDF facturen
- ✅ Dispatch paneel voor ritten, chauffeurs en partners
- ✅ Financieel dashboard met omzetgrafieken
- ✅ CSV/JSON export

### 2. Horizon C2 (Woningen) 🏠
**Voor:** Vakantieparken, makelaars, vastgoedbeheerders

- ✅ Boekingswebsite voor 10+ woningen/units
- ✅ Commander beheerpaneel met status workflow
- ✅ Taakverdeling aan teamleden (Host, Concierge, Housekeeping)
- ✅ Agenda met kalender en afspraken
- ✅ Financieel overzicht per team

### 3. Auto Dealer Pro 🚗
**Voor:** Occasion dealers

- ✅ Voorraadbeheer met status (Nieuw/Beschikbaar/Verkocht)
- ✅ Verkoopregistratie met winst & marge berekening
- ✅ PDF factuur generatie met BTW
- ✅ WhatsApp delen van auto's
- ✅ CSV export

---

## ✨ Features per module

### 🚖 Taxi Module

| Functionaliteit | Status |
|----------------|--------|
| Boekingswebsite (5 stappen) | ✅ |
| Adres autocomplete (Nominatim) | ✅ |
| Routeberekening (OSRM/GraphHopper) | ✅ |
| Prijsberekening: €1,50/km | ✅ |
| Heen/terug rit (2x prijs) | ✅ |
| Voertuigkeuze (4 types) | ✅ |
| Extra opties (Meet & Greet, WiFi, etc.) | ✅ |
| Klantportaal met ritgeschiedenis | ✅ |
| PDF factuur download | ✅ |
| Dispatch paneel | ✅ |
| Chauffeurs & Partners beheer | ✅ |
| Financieel dashboard | ✅ |

### 🏠 Woningen Module

| Functionaliteit | Status |
|----------------|--------|
| Boekingswebsite met 10+ units | ✅ |
| Check-in / Check-out datum | ✅ |
| Prijs per nacht | ✅ |
| Extra diensten (Housekeeping, Ontbijt, Chef) | ✅ |
| Commander beheerpaneel | ✅ |
| Status workflow (Nieuw/Bevestigd/Uitgevoerd) | ✅ |
| Taakverdeling aan teamleden | ✅ |
| Agenda met kalender | ✅ |
| Team beheer | ✅ |
| Financieel per team | ✅ |

### 🚗 Auto Dealer Module

| Functionaliteit | Status |
|----------------|--------|
| Voorraadbeheer | ✅ |
| Verkoopregistratie | ✅ |
| PDF factuur met BTW | ✅ |
| Winst & marge berekening | ✅ |
| WhatsApp delen | ✅ |
| CSV export | ✅ |
| Verkopers & Leveranciers beheer | ✅ |

---

## 📥 Installatie

### Vereisten
- Supabase account (gratis tier)
- Basiskennis HTML/JavaScript
- Webserver (Netlify/Vercel/GitHub Pages of eigen server)

### Stap 1: Supabase project aanmaken
1. Ga naar [supabase.com](https://supabase.com)
2. Maak een nieuw project aan
3. Noteer je `Project URL` en `anon key`

### Stap 2: Database tabellen aanmaken
Open de SQL editor in Supabase en voer uit:

```sql
-- Bookings tabel (centraal voor alle modules)
CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    datetime DATE,
    time TIME,
    name TEXT,
    email TEXT,
    phone TEXT,
    pickup TEXT,
    destination TEXT,
    flight_number TEXT,
    vehicle TEXT,
    extras TEXT,
    amount DECIMAL,
    payment TEXT,
    status TEXT DEFAULT 'pending',
    customer_id TEXT,
    form_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers tabel (voor klantportaal)
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners tabel (taxi module)
CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    name TEXT,
    contact TEXT,
    email TEXT,
    phone TEXT,
    prefix TEXT
);

-- Drivers tabel (taxi module)
CREATE TABLE drivers (
    id SERIAL PRIMARY KEY,
    subcontractor_id INTEGER,
    driver_code TEXT,
    name TEXT,
    vehicle TEXT,
    license_plate TEXT,
    partner_name TEXT
);

-- Teamleden tabel (woningen module)
CREATE TABLE teamleden (
    id SERIAL PRIMARY KEY,
    naam TEXT,
    telefoon TEXT,
    email TEXT,
    functies TEXT[]
);

-- Boekingen taken (woningen module)
CREATE TABLE boekingen_taken (
    id SERIAL PRIMARY KEY,
    booking_id TEXT,
    taak_naam TEXT,
    team_lid_id INTEGER
);

-- Kalender afspraken (woningen module)
CREATE TABLE kalender_afspraken (
    id SERIAL PRIMARY KEY,
    titel TEXT,
    start_datum TIMESTAMPTZ,
    eind_datum TIMESTAMPTZ,
    type TEXT,
    memo TEXT
);
Stap 3: Configuratie aanpassen
Open elk HTML bestand en vervang de Supabase gegevens:

javascript
const SUPABASE_URL = 'jouw-project-url';
const SUPABASE_ANON_KEY = 'jouw-anon-key';
Bestanden die je moet aanpassen:

fleetconnect.html

index.html / klantenportaal.html

onderaannemerA.html

commander.html

autodealerpaneel.html

admin-index.html

Horizon.html / bravo.html

PV.html

loginfleetconnect.html

klantenportaalpv.html

Stap 4: Bestanden uploaden
Upload alle bestanden naar je webserver:

Netlify: Drag & drop de map naar netlify.com/drop

Vercel: vercel --prod

GitHub Pages: Zet bestanden in docs/ folder en enable in settings

💡 Tip: Start met Netlify – dit is de makkelijkste optie.

⚙️ Configuratie
Supabase Auth instellen
Ga naar Supabase Dashboard → Authentication → Settings

Zet "Email" provider aan

Zet "Auto confirm email" aan (voor testing)

Voeg redirect URLs toe: https://jouwdomein.be/*

📊 Database Schema Diagram
text
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   customers ◄──────────┐                                        │
│   ┌──────────────┐     │                                        │
│   │ id (PK)      │     │                                        │
│   │ email        │     │                                        │
│   │ name         │     │                                        │
│   │ phone        │     │                                        │
│   └──────────────┘     │                                        │
│                        │                                        │
│   bookings ◄───────────┘                                        │
│   ┌──────────────┐                                              │
│   │ id (PK)      │                                              │
│   │ customer_id  │──┐                                          │
│   │ datetime     │  │                                          │
│   │ pickup       │  │                                          │
│   │ destination  │  │                                          │
│   │ amount       │  │                                          │
│   │ status       │  │                                          │
│   └──────────────┘  │                                          │
│                     │                                          │
│   boekingen_taken ◄─┘                                          │
│   ┌──────────────┐                                              │
│   │ id (PK)      │                                              │
│   │ booking_id   │──┐                                          │
│   │ taak_naam    │  │                                          │
│   │ team_lid_id  │  │                                          │
│   └──────────────┘  │                                          │
│                     │                                          │
│   teamleden ◄───────┘                                          │
│   ┌──────────────┐                                              │
│   │ id (PK)      │                                              │
│   │ naam         │                                              │
│   │ functies     │                                              │
│   └──────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
📁 Bestandsstructuur
text
ryzen-ecosysteem/
├── admin-index.html        # Centrale login hub
├── fleetconnect.html       # Taxi boeking
├── onderaannemerA.html     # Taxi dispatch paneel
├── klantenportaal.html     # Taxi klantportaal
├── index.html              # Taxi klant login
├── loginfleetconnect.html  # Taxi admin login
├── commander.html          # Woningen beheerpaneel
├── Horizon.html            # Woningen boeking (Hoofd)
├── bravo.html              # Woningen boeking (Tanger)
├── PV.html                 # Royal Velvet (Luxe taxi)
├── autodealerpaneel.html   # Auto dealer software
├── klantenportaalpv.html   # Royal Velvet klantportaal
└── README.md               # Deze documentatie
⚠️ Bekende beperkingen
Beperking	Impact	Fix gepland
Chauffeurs/partners in localStorage	Data is niet gedeeld tussen browsers	Q3 2026
Geen online betalingen	Klanten kunnen niet online betalen	Q3 2026
Eenvoudige authenticatie	Alleen email check, geen wachtwoord	Q3 2026
Geen live tracking	Chauffeurs kunnen niet gevolgd worden	Q4 2026
Geen mobiele apps	Alleen web beschikbaar	Q4 2026
🚀 Snel starten
Actie	Bestand
Taxi boeking	fleetconnect.html
Admin login	admin-index.html
Dispatch paneel	Login → Kies "Onderaannemer"
Woningen beheer	Login → Kies "Woningen Verhuur"
Auto dealer	Login → Kies "Auto Dealer"
Klantportaal taxi	index.html → inloggen
Klantportaal Royal Velvet	loginfleetconnect.html → inloggen
📄 Licentie
MIT License

Copyright (c) 2026 Ryzen Development

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

📞 Contact
Vraag	Contact
Technische vragen	GitHub Issues
Zakelijke vragen	jouw@email.com
Made with ❤️ by Ryzen Development

text

### Optie 2 (extra) – Bewaar de HTML als apart bestand
Als je de mooie HTML-pagina wilt behouden:
1. Maak een nieuwe map `docs/` aan.
2. Zet de HTML-code die ik eerder gaf in een bestand `docs/readme.html`.
3. Voeg in `README.md` een link toe:  
   `📘 [Bekijk de uitgebreide documentatie (HTML)](docs/readme.html)`

---

## ▶️ Volgende stap

**Kopieer de Markdown-tekst hierboven** en plak hem in `README.md` op GitHub.  
Daarna ziet je README er correct uit. Wil je dat ik ook de HTML-versie voor `docs/readme.html` nog een keer oplever?

## 👥 Partners & Drivers (hiërarchisch model)

Het systeem ondersteunt een **hoofdpartner** (eigen onderneming) met meerdere **subpartners**. Elke partner heeft een eigen prefix voor chauffeurscodes.

### Tabellen

**`partners`**
- `id` – uniek nummer
- `name` – bedrijfsnaam
- `is_hoofd` – `true` voor eigen onderneming, `false` voor subpartner
- `parent_partner_id` – verwijzing naar hoofdpartner (alleen voor subpartners)
- `prefix` – unieke code voor chauffeurs, bv. `DFC`, `PAA`, `PAB`

**`drivers`**
- `id` – uniek nummer
- `partner_id` – koppeling aan een partner (hoofd of sub)
- `driver_code` – automatisch gegenereerd, bv. `DFC-01`, `PAA-02`
- `name` – naam chauffeur
- `vehicle` – type voertuig (optioneel)

### Voorbeeldhiërarchie
Eigen onderneming (DFC)
├── chauffeurs: DFC-01, DFC-02, ...
├── Partner Jan (PAA)
│ └── chauffeurs: PAA-01, PAA-02, ...
└── Partner Piet (PAB)
└── chauffeurs: PAB-01, ...

text

Deze structuur maakt het mogelijk om per partner aparte chauffeurs te beheren, terwijl alle ritten centraal in de `bookings`‑tabel blijven.
