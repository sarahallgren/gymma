# Gymma

En enkel träningsapp för gymmet. Den fungerar i mobilens webbläsare och kan läggas på hemskärmen som en app.

## Vad den gör

- **Starta ett pass** från en färdig mall (Helkropp A eller B) eller välj övningar själv.
- **Logga set** med kilo och reps. Appen fyller i vad du gjorde förra gången, så du ser direkt om du ökar.
- **Historik** över alla pass, med tid och total vikt du lyft.
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
| `exercises.js` | Övningar och färdiga pass – enklast att ändra här |
| `app.js` | All logik: pass, set, historik, sparande |
| `manifest.webmanifest`, `icon*` | Gör att den kan installeras som app |
