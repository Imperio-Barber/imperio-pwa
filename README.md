# Imperio Barber Panel PWA

Pierwsza wersja MVP aplikacji do wpisywania utargów w salonie.

## Co działa w tej wersji

Panel pracownika:

1. wybór pracownika,
2. wybór usługi,
3. wpisanie kwoty,
4. wybór płatności: gotówka, karta, Booksy Pay, voucher,
5. wpisanie napiwku,
6. lista dzisiejszych transakcji,
7. podsumowanie dnia,
8. zamknięcie dnia.

Panel administratora:

1. wybór daty,
2. podsumowanie całego salonu,
3. podział na pracowników,
4. gotówka, karta, Booksy Pay, voucher, napiwki,
5. status zamknięcia dnia,
6. eksport CSV.

Aplikacja działa też w trybie demo bez Supabase, ale wtedy dane znikają po odświeżeniu.

## Jak uruchomić lokalnie

### 1. Zainstaluj Node.js

Pobierz wersję LTS z nodejs.org.

### 2. Otwórz folder projektu

W terminalu wejdź do folderu:

```bash
cd imperio-pwa
```

### 3. Zainstaluj paczki

```bash
npm install
```

### 4. Uruchom projekt

```bash
npm run dev
```

Otwórz w przeglądarce:

```text
http://localhost:3000
```

## Jak podłączyć Supabase

### 1. Załóż projekt w Supabase

Wejdź na supabase.com i utwórz nowy projekt.

### 2. Wklej SQL

W Supabase wejdź w:

SQL Editor → New query

Wklej zawartość pliku:

```text
supabase.sql
```

Kliknij Run.

### 3. Skopiuj dane API

W Supabase wejdź w:

Project Settings → API

Skopiuj:

1. Project URL,
2. anon public key.

### 4. Utwórz plik .env.local

W głównym folderze projektu utwórz plik:

```text
.env.local
```

Wklej:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_wklej_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_wklej_anon_public_key
```

Po zmianie pliku `.env.local` zatrzymaj projekt i uruchom ponownie:

```bash
npm run dev
```

## Jak wrzucić aplikację online

Najprościej przez Vercel.

1. Załóż konto na GitHub.
2. Wrzuć projekt do repozytorium GitHub.
3. Załóż konto na Vercel.
4. Kliknij Add New Project.
5. Wybierz repozytorium z aplikacją.
6. Dodaj zmienne środowiskowe:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

7. Kliknij Deploy.

Po wdrożeniu dostaniesz link do aplikacji.

## Jak używać na tablecie

Na iPadzie lub telefonie:

1. otwórz link do aplikacji,
2. wybierz udostępnianie,
3. kliknij „Dodaj do ekranu początkowego”.

Aplikacja będzie wyglądała jak normalna apka.

## Co warto dodać w kolejnej wersji

1. logowanie pracowników kodem PIN,
2. prawdziwe role admin/pracownik,
3. edycja i usuwanie transakcji tylko przez admina,
4. raport miesięczny,
5. kontrola z kasą fiskalną, Fiserv i Booksy Pay,
6. rozliczanie prowizji pracowników,
7. produkty i kosmetyki,
8. historia zmian.
