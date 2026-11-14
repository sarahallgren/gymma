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
- **Logga bara sista setet:** Målet är 4 set × 12 reps. En övning i taget är öppen. Du ställer in vikt och reps med plus och minus och trycker **Klar**. Klara övningar krymper till en rad.
- **Förslag på högre vikt:** Klarade du alla reps förra gången föreslår appen nästa vikt.
- **Veckorad** på startsidan som visar vilka dagar du har tränat.
- **Bilder** som visar start- och slutläge för varje övning.
- **Historik** per månad. Varje pass går att fälla ut och visar om du har ökat sedan förra gången.
- **Övningar** med sök och filter. Varje övning visar senaste resultat, bästa vikt, plats i schemat och en kurva över utvecklingen. Du kan lägga till egna övningar.
- **Färgteman:** Grön, rosa, blå, grå och sand. Byt med palettknappen uppe till höger. Ljust eller mörkt läge följer mobilens inställning.
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
| `style.css` | Utseende: färgteman (överst i filen), knappar, mörkt läge |
| `exercises.js` | Övningar, veckoschema, rotationen (`ROTATION`) och antal set/reps – enklast att ändra här |
| `bilder/` | Två bilder per övning (start och slut) |
| `app.js` | All logik: pass, set, historik, sparande |
| `manifest.webmanifest`, `icon*` | Gör att den kan installeras som app |

## Bilderna

Övningsbilderna kommer från [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), som är fri att använda (public domain, Unlicense). De är förminskade för att ladda snabbt i mobilen.
