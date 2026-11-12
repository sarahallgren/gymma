# Gymma

En enkel träningsapp för gymmet. Den fungerar i mobilens webbläsare och kan läggas på hemskärmen som en app.

## Vad den gör

- **Dagens pass** enligt veckoschemat visas överst på startsidan:
  - Måndag: axlar och vader
  - Tisdag: rygg och triceps
  - Onsdag: bröst och biceps
  - Torsdag: vila
  - Fredag: ben och mage
- **Treveckorsrotation:** 3 övningar per muskelgrupp och pass – en för varje del av muskeln (till exempel främre, sidan och bakre axeln). Övningarna byts varje vecka i en cykel på 3 veckor. Fliken **Schema** visar hela rotationen.
- **Logga bara sista setet:** Målet är 4 set × 12 reps. Du skriver vikt och hur många reps du orkade i sista setet. Nästa gång ser du det och vikten är ifylld.
- **Bilder** som visar start- och slutläge för varje övning.
- **Historik** över alla pass, med vikt och reps i sista setet.
- **Övningar** sorterade per muskelgrupp, med ditt bästa lyft. Du kan lägga till egna övningar.
- **Säkerhetskopia** som du kan spara som fil och läsa in igen.

## Var sparas mina pass?

Bara i webbläsaren på din mobil (localStorage). Inget skickas till någon server.
Det betyder att passen försvinner om du rensar webbläsarens data eller byter mobil, så spara en kopia ibland under **Historik → Spara kopia**.

## Publicera appen gratis med GitHub Pages

1. Gå till repot på GitHub → **Settings** → **Pages**.
2. Under **Build and deployment**, välj **Deploy from a branch**.
3. Välj grenen **main** och mappen **/ (root)**. Klicka **Save**.
4. Efter en minut finns appen på `https://sarahallgren.github.io/gymma/`.

## Lägg appen på hemskärmen

- **iPhone (Safari):** Dela-knappen → **Lägg till på hemskärmen**.
- **Android (Chrome):** Menyn ⋮ → **Lägg till på startskärmen**.

## Filerna

| Fil | Vad den innehåller |
|---|---|
| `index.html` | Sidans grundstruktur |
| `style.css` | Utseende: färger, knappar, mörkt läge |
| `exercises.js` | Övningar, veckoschema, rotationen (`ROTATION`) och antal set/reps – enklast att ändra här |
| `bilder/` | Två bilder per övning (start och slut) |
| `app.js` | All logik: pass, set, historik, sparande |
| `manifest.webmanifest`, `icon*` | Gör att den kan installeras som app |

## Bilderna

Övningsbilderna kommer från [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), som är fri att använda (public domain, Unlicense). De är förminskade för att ladda snabbt i mobilen.
